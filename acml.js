var Objs = new Meteor.Collection("Objs");
var Acls = new Meteor.Collection("Acls");

var i=1;

var collection = ["$"];

function processLine(line) {
	/*emptyLine = new Regexp('^\\s+$');
	
	if (line.match(emptyLine)) {
		return 'asd';
	}*/

	retlines = line + '\n';
	
	acls = Acls.find();
	
	acls.forEach(function(acl) {
		reg = new RegExp('#include ' + acl.Name + '$');
		if (line.match(reg)) {
			included_lines = parse(acl.Content);
			console.log(included_lines);
			retlines = included_lines;
		} else {
			objs = Objs.find();
			objs.forEach(function(obj)  {	
				reg1 = new RegExp('.*\\$' + obj.Name  + '\\s+?.*');
				reg2 = new RegExp('.*\\$' + obj.Name  + '$');

				if ((line.match(reg1)) || (line.match(reg2))) {
					retlines = '';
					// betenni ellenorzest XXX ha nincs egy value se kulonben crash
					obj.Values.forEach(function(value) {
						newline = line.replace(new RegExp('\\$' + obj.Name, 'g'),value.value);
						retlines += processLine(newline); // xxx kiszedtem plusz newline
					});		
				}
			});
		}
	});
	
	return retlines;
};

function parse(s) {
	result = '';
	var splitted = s.split("\n");
	for (i in splitted) {
		result = result + processLine(splitted[i]);
	}
	return result;
};

if (Meteor.is_client) {

Handlebars.registerHelper("render", function(name) {
  return  Template.Objs;
});


Template.Acls.Acllist = function(){
   return Acls.find({}, {sort: {Name: 1}});
};

Template.Menu.events = {
	'click #nav-objects': function() {
		Session.set('page','objects');
	},
	'click #nav-acls': function() {
		Session.set('page','acls');
		$('#editor').hide();
		console.log('acls');
	},
};

Template.Main.Page = function() {
	return Session.get('page');
};

Template.Main.page_is = function(page) {
	return Session.get('page') == page;
};

Template.Acls.events = {
		'click li.acllist': function() {

					console.log("filling objs");	
			var objs = Objs.find();
				objs.forEach(function(obj)  {
				console.log(obj.Name);
				collection.push('$' + obj.Name);
				});
			
		
        function split( val ) {
            return val.split( / / );
        }
        function extractLast( term ) {
            return split( term ).pop();
        }
 
        $( ".kiegeszites" )
            // don't navigate away from the field on tab when selecting an item
            .bind( "keydown", function( event ) {
				console.log('lofasz');
                if ( event.keyCode === $.ui.keyCode.TAB &&
                        $( this ).data( "autocomplete" ).menu.active ) {
                    event.preventDefault();
                }
            })
            .autocomplete({
                minLength: 0,
                source: function( request, response ) {
                    // delegate back to autocomplete, but extract the last term
                    response( $.ui.autocomplete.filter(
                        collection, extractLast( request.term ) ) );
                },
                focus: function() {
                    // prevent value inserted on focus
                    return false;
                },
                select: function( event, ui ) {
                    var terms = split( this.value );
                    // remove the current input
                    terms.pop();
                    // add the selected item
                    terms.push( ui.item.value );
                    // add placeholder to get the comma-and-space at the end
                    terms.push("");
                    this.value = terms.join(" ");
                    return false;
                }
            });
    
			

	
			Session.set('aclid',this._id);
			$('#aclcontent').val(this.Content);
			$('#aclTitle').html(this.Name);
			$('#generatedContent').hide();
			$('#editor').show();
		},
		'click #deleteacl': function () {
			console.log('delete clicked');
			Acls.remove({_id:Session.get('aclid')});
			Session.set('aclid',null);
			$('#editor').hide();
			$('#aclErrorDialog').html('<span class="label label-success">Deleted!</span>');
			$('#aclErrorDialog').show().delay(5000).fadeOut();
		},
		'click #generate': function () {
			$('#generatedaclcontent').show();
			var s = document.getElementById("aclcontent").value;
			Acls.update({_id:Session.get('aclid')},{$set:{Content:s}});
			console.log($('#aclcontent').value);
			$('#generatedaclcontent').text(parse(s));
			$('#generatedContent').show();

		},
		'click #parsesubmit': function () {
			var s = document.getElementById("aclcontent").value;
			Acls.update({_id:Session.get('aclid')},{$set:{Content:s}});
			$('#aclErrorDialog').html('<span class="label label-success">Saved successfully!</span>');
			$('#aclErrorDialog').show().delay(5000).fadeOut();
		},
		'click #newaclsubmit': function () {
			var newacl = document.getElementById("newaclname").value;

			validRegex = /^[a-zA-Z0-9_-]+$/;
			
			if (!validRegex.test(newacl)) {
				$('#aclErrorDialog').replaceWith('<div id="aclErrorDialog">error!</div>');
				$('#aclErrorDialog').delay(5000).fadeOut();
				document.getElementById("newaclname").value = "";
			} else if (Acls.find({Name:newacl}).count() > 0) {
				$('#aclErrorDialog').replaceWith('<div id="aclErrorDialog"><span class="label label-warning">ACL already exists!</span></div>');
				$('#aclErrorDialog').delay(5000).fadeOut();				
			} else {			
				Acls.insert({Name: newacl,Content:''});
				$('#aclErrorDialog').replaceWith('<div id="aclErrorDialog"><span class="label label-success">Succesfully inserted!</span><span class="label</div>');
				$('#aclErrorDialog').delay(5000).fadeOut();
				document.getElementById("newaclname").value = "";
			}
			
		},
};



Template.Objs.Objlist = function(){
   return Objs.find({}, {sort: {Name: 1}});
};

Template.Objs.events = {
		'click .delObjectButton': function () {
				console.log(this._id);
				Objs.remove({_id:this._id});				
		},
		'click .delValueButton': function () {
				console.log(this._id);
				Objs.update({'Values._id':this._id}, {$pull:{Values:{_id:this._id}}});				
		},
		'click #newvaluesubmit': function () {
				var newValue = document.getElementById("newvalue_" + this._id).value;
				console.log(newValue);
				console.log(this._id);
				Objs.update({_id:this._id},{$push:{Values:{_id:Meteor.uuid(),value:newValue}}});
		},
		'click #newobjectsubmit': function () {
			var newobj = document.getElementById("newobjectname").value;

			validRegex = /^[a-zA-Z0-9_]+$/;
			
			if (!validRegex.test(newobj)) {
				$('#errorDialog').replaceWith('<div id="errorDialog">error!</div>');
				$('#errorDialog').delay(5000).fadeOut();
				document.getElementById("newobjectname").value = "";
			} else if (Objs.find({Name:newobj}).count() > 0) {
				$('#errorDialog').replaceWith('<div id="errorDialog">Object already exists!</div>');
				$('#errorDialog').delay(5000).fadeOut();				
			} else {			
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