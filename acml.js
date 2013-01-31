
// define the two mongo collections:
var Objs = new Meteor.Collection("Objs");
var Acls = new Meteor.Collection("Acls");

/* 
	processes a single line of ACL. replaces any known objects with their values. handles #includes.
	returns: one or more processed lines.
*/
function processLine(line) {

	// retlines will be return value, initalize it with the input line
	retlines = line + '\n';
	
	// fetch available ACLs
	acls = Acls.find();
	
	// enumerate available acls
	acls.forEach(function(acl) {

		// if this line is an $include with a valid acl name..
		reg = new RegExp('#include ' + acl.Name + '$');
		if (line.match(reg)) {
			// then recursively parse the contents of the acl and return the results
			included_lines = parseAcl(acl.Content);
			retlines = included_lines;
		} else {
			// else enumerate all stored objects
			objs = Objs.find();
			objs.forEach(function(obj)  {	
				reg1 = new RegExp('.*\\$' + obj.Name  + '\\s+?.*');
				reg2 = new RegExp('.*\\$' + obj.Name  + '$');

				if ((line.match(reg1)) || (line.match(reg2))) {
					// if this line contains a valid $object, then first reset the return value..
					retlines = '';
					// ..then enumerate all values of the object, replacing any occurences of $object and recursively process the resulting line
					// XXX: betenni ellenorzest ha nincs egy value se kulonben crash
					obj.Values.forEach(function(value) {
						newline = line.replace(new RegExp('\\$' + obj.Name, 'g'), value.value);
						retlines += processLine(newline); // XXX: plusz newline kiszedve
					});		
				}
			});
		}
	}); // end acls enumeration
	
	return retlines;
};


/*
	parses a string containing a complete ACL.
	processes every line with processLine()
	returns the processed lines as a string.
*/
function parseAcl(s) {
	result = '';
	var splitted = s.split("\n");
	for (i in splitted) {
		result = result + processLine(splitted[i]);
	}
	return result;
};



if (Meteor.is_client) {

	/* template helpers: */	

	Handlebars.registerHelper("render", function(name) {
	  return  Template.Objs;
	});

	Template.Main.Page = function() {
		return Session.get('page');
	};

	Template.Main.page_is = function(page) {
		return Session.get('page') == page;
	};

	// main menu event listeners:
	Template.Menu.events = {
		// Objects:
		'click #nav-objects': function() {
			Session.set('page','objects');
		},
		// ACLs:
		'click #nav-acls': function() {
			Session.set('page','acls');
			// hide the editor by default:
			$('#editor').hide();
		},
	};






	// binds the stored acls to the Acls template, sorted by name
	Template.Acls.Acllist = function(){
	   return Acls.find({}, {sort: {Name: 1}});
	};


	// binds the stored objects to the Objs template, sorted by name
	Template.Objs.Objlist = function(){
   		return Objs.find({}, {sort: {Name: 1}});
	};




	// ACL page event listeners:
	Template.Acls.events = {
		// binds to clicks on the list of ACLs
		'click li.acllist': function() {
			// set the selected acl in session, fill various html entities, show the editor:
			Session.set('aclid',this._id);
			$('#aclcontent').val(this.Content);
			$('#aclTitle').html(this.Name);
			$('#generatedContent').hide();
			$('#editor').show();
		},

		// binds to the delete acl event:
		'click #deleteacl': function () {
			// remove the acl from mongodb. unset the selected acl, hide the editor, etc.
			Acls.remove({_id:Session.get('aclid')});
			Session.set('aclid',null);
			$('#editor').hide();
			$('#aclErrorDialog').html('<span class="label label-success">Deleted!</span>');
			$('#aclErrorDialog').show().delay(5000).fadeOut();
		},

		// binds to the generate event:
		'click #generate': function () {


			// get the value from the editor:
			var s = document.getElementById("aclcontent").value;

			// save it first:
			Acls.update({_id:Session.get('aclid')},{$set:{Content:s}});

			// parse the ACL:
			$('#generatedaclcontent').text(parseAcl(s));

			// show the output textarea:
			$('#generatedaclcontent').show();
			$('#generatedContent').show();
		},

		// binds to the Save ACL event:
		'click #saveAcl': function () {
			var s = document.getElementById("aclcontent").value;
			Acls.update({_id:Session.get('aclid')},{$set:{Content:s}});
			$('#aclErrorDialog').html('<span class="label label-success">Saved successfully!</span>');
			$('#aclErrorDialog').show().delay(5000).fadeOut();
		},

		// binds to the new acl creation burron:
		'click #createAcl': function () {

			// fetch the submitted name
			var newacl = document.getElementById("newaclname").value;

			// must match this regex
			validRegex = /^[a-zA-Z0-9_-]+$/;
			
			if (!validRegex.test(newacl)) {
				// disallowed name
				$('#aclErrorDialog').replaceWith('<div id="aclErrorDialog">error!</div>');
				$('#aclErrorDialog').delay(5000).fadeOut();
				document.getElementById("newaclname").value = "";
			} else if (Acls.find({Name:newacl}).count() > 0) {
				// already exists
				$('#aclErrorDialog').replaceWith('<div id="aclErrorDialog"><span class="label label-warning">ACL already exists!</span></div>');
				$('#aclErrorDialog').delay(5000).fadeOut();				
			} else {			
				// success
				Acls.insert({Name: newacl,Content:''});
				$('#aclErrorDialog').replaceWith('<div id="aclErrorDialog"><span class="label label-success">Succesfully inserted!</span><span class="label</div>');
				$('#aclErrorDialog').delay(5000).fadeOut();
				document.getElementById("newaclname").value = "";
			}
			
		},
};



	/* 
		Object page event listeners:
	*/


		Template.Objs.events = {
				// delete an object:
				'click .delObjectButton': function () {
						Objs.remove({_id:this._id});				
				},
				// delete a single value from an object:
				'click .delValueButton': function () {
						Objs.update({'Values._id':this._id}, {$pull:{Values:{_id:this._id}}});				
				},
				// add a single value to an object:
				'click .addObjectValue': function () {
						var newValue = document.getElementById("newvalue_" + this._id).value;
						console.log(newValue);
						console.log(this._id);
						Objs.update({_id:this._id},{$push:{Values:{_id:Meteor.uuid(),value:newValue}}});
				},
				// create a new, empty object:
				'click #newobjectsubmit': function () {
					var newobj = document.getElementById("newobjectname").value;

					// must match this regex
					validRegex = /^[a-zA-Z0-9_]+$/;
					
					if (!validRegex.test(newobj)) {
						// invalid name
						$('#errorDialog').replaceWith('<div id="errorDialog">error!</div>');
						$('#errorDialog').delay(5000).fadeOut();
						document.getElementById("newobjectname").value = "";
					} else if (Objs.find({Name:newobj}).count() > 0) {
						// already in the database
						$('#errorDialog').replaceWith('<div id="errorDialog">Object already exists!</div>');
						$('#errorDialog').delay(5000).fadeOut();				
					} else {			
						// success
						Objs.insert({Name: newobj});
						$('#errorDialog').replaceWith('<div id="errorDialog">Succesfully inserted!</div>');
						$('#errorDialog').delay(5000).fadeOut();
						document.getElementById("newobjectname").value = "";
					}
			
		},
	};
	



Meteor.startup(function () {
		$('.delObjectButton').css("border","3px solid red");
		$('.delObjectButton').hide("border","3px solid red");
		$('#editor').hide();
		
	});
};






if (Meteor.is_server) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}