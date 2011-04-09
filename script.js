// load Google's JS API and setup the init function
google.load("gdata", "2.x");
google.setOnLoadCallback(main);


var contactsService = null;
var contactsServiceScope = 'https://www.google.com/m8/feeds';

/**
 * The init function that initializes everything
 */
function main() {
    var hdr = document.getElementById('header');

    if(google.accounts.user.checkLogin(contactsServiceScope)){
        // we're logged in already, create logout button
        var btn = document.createElement('button');
        btn.innerText = 'Switch Account';
        btn.onclick   = google.accounts.user.logout;
        hdr.innerHTML = '';
        hdr.appendChild(btn);

        // initialize the global contact service
        contactsService = new google.gdata.contacts.ContactsService('splitbrain.org-phonefix-1.0');

        // load the contacts
        loadContacts();
    }else{
        // make a login button
        var btn = document.createElement('button');
        btn.innerText = 'Logout';
        btn.onclick   = function(){
            var token = google.accounts.user.login(contactsServiceScope);
        };
        hdr.innerHTML = '';
        hdr.appendChild(btn);
    }
}

/**
 * Load all the contacts
 */
function loadContacts() {
    var contactsFeedUri = 'https://www.google.com/m8/feeds/contacts/default/full';
    var query = new google.gdata.contacts.ContactQuery(contactsFeedUri);

    // set a throbber
    var out = document.getElementById('output');
    out.innerHTML = '<img src="throbber.gif" />Loading contacts...';

    // Set the maximum of the result set to be 5
    query.setMaxResults(5);
    contactsService.getContactFeed(query, handleContacts, handleError);
}

/**
 * Callback for loadContacts
 *
 * Display the contact results.
 */
function handleContacts(result){
    var out = document.getElementById('output');
    out.innerHTML = '';

    var entries = result.feed.entry;
    for (var i = 0; i < entries.length; i++) {
        var contactEntry = entries[i];
        var emailAddresses = contactEntry.getEmailAddresses();

        for (var j = 0; j < emailAddresses.length; j++) {
            var emailAddress = emailAddresses[j].getAddress();

            out.innerHTML += emailAddress +'<br />';
        }
    }
}

/**
 * Callback. Display an error
 */
function handleError(error){
    var out = document.getElementById('output');
    var err = document.createElement('div');
    err.className = 'error';
    err.innerText = error;
    out.appendChild(error);
}
