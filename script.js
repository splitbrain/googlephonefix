// load Google's JS API and setup the init function
google.load("gdata", "2.x");
google.setOnLoadCallback(main);


var contactsService = null;
var contactsServiceScope = 'https://www.google.com/m8/feeds';
var countryprefix = '';
var fixemails = true;

/**
 * The init function that initializes everything
 */
function main() {
    var hdr = document.getElementById('header');

    if (google.accounts.user.checkLogin(contactsServiceScope)) {
        // we're logged in already, create logout button
        var btn = document.createElement('button');
        btn.innerHTML = 'Logout';
        btn.onclick = function() {
            google.accounts.user.logout();
            location.reload(true);
        }
        hdr.innerHTML = '';
        hdr.appendChild(btn);

        // initialize the global contact service
        contactsService = new google.gdata.contacts.ContactsService('splitbrain.org-phonefix-1.0');

        // show the init screen
        startGUI();
    } else {
        // make a login button
        var btn = document.createElement('button');
        btn.innerHTML = 'Login to Google Contacts';
        btn.onclick = function() {
            var token = google.accounts.user.login(contactsServiceScope);
        };
        hdr.innerHTML = '';
        hdr.appendChild(btn);
    }
}

function startGUI() {
    var out = document.getElementById('output');
    out.innerHTML = '<p><label for="countryprefix">Default Country Prefix: </label>' +
                    '<input type="text" id="countryprefix" value="+49" size="3" /> ' +
                    '<input type="checkbox" checked="checked" id="fixemails" />' +
                    '<label for="fixemails">Fix Emails</label></p>';
    var btn = document.createElement('button');
    btn.innerHTML = 'Load contacts and preview fixed contacts...';
    btn.onclick = function() {
        // set global prefix
        countryprefix = document.getElementById('countryprefix').value;

        // set global email pref
        if(document.getElementById('fixemails').checked){
            fixemails = true;
        }else{
            fixemails = false;
        }

        // load the contacts
        loadContacts();
    }
    out.appendChild(btn);
}

/**
 * Load all the contacts
 */
function loadContacts() {
    var contactsFeedUri = 'https://www.google.com/m8/feeds/contacts/default/full';
    var query = new google.gdata.contacts.ContactQuery(contactsFeedUri);

    // set a throbber
    var out = document.getElementById('output');
    out.innerHTML = '<img src="throbber.gif"> Loading contacts...';

    // FIXME set maximum
    query.setMaxResults(5000);
    contactsService.getContactFeed(query, handleContacts, handleError);
}

/**
 * Callback for loadContacts
 *
 * Display the contact results.
 */
function handleContacts(result) {
    var out = document.getElementById('output');
    out.innerHTML = '';

    var table = document.createElement('table');
    out.appendChild(table);

    var x = 0;

    var entries = result.feed.entry;
    for (var i = 0; i < entries.length; i++) {
        var contactEntry = entries[i];

        try {
            var name = contactEntry.getName().getFullName().getValue();
        } catch (err) {
            continue; //skip entries without a name
        }

        var numbers = contactEntry.getPhoneNumbers();
        var emails = contactEntry.getEmailAddresses();

        if ((numbers.length == 0) && (emails.length == 0)) continue; //skip entries without phone or mail address
        for (var j = 0; j < numbers.length; j++) {
            var th, tr, td, tx;

            tr = document.createElement('tr');

            th = document.createElement('th');
            th.innerText = name;
            tr.appendChild(th);

            td = document.createElement('td');
            td.innerText = numbers[j].getValue();
            tr.appendChild(td);

            td = document.createElement('td');
            tx = document.createElement('input');
            tx.value = phoneClean(numbers[j].getValue());
            // remember tree references in the DOM object
            tx.contactEntry = contactEntry;
            tx.phoneNumber = numbers[j];
            td.appendChild(tx);
            tr.appendChild(td);

            if (tx.value != numbers[j].getValue()) {
                if (x % 2) {
                    tr.className = 'even';
                }
                table.appendChild(tr);
                x = x + 1;
            }
        }

        if(fixemails) for (var j = 0; j < emails.length; j++) {
            var th, tr, td, tx;

            tr = document.createElement('tr');

            th = document.createElement('th');
            th.innerText = name;
            tr.appendChild(th);

            td = document.createElement('td');
            td.innerText = emails[j].getAddress();
            tr.appendChild(td);

            td = document.createElement('td');
            tx = document.createElement('input');
            tx.value = mailClean(emails[j].getAddress());
            // remember tree references in the DOM object
            tx.contactEntry = contactEntry;
            tx.mailAddress = emails[j];
            td.appendChild(tx);
            tr.appendChild(td);

            if (tx.value != emails[j].getAddress()) {
                if (x % 2) {
                    tr.className = 'even';
                }
                table.appendChild(tr);
                x = x + 1;
            }
        }

    }

    if (table.innerHTML != "") {
        var btn = document.createElement('button');
        btn.innerHTML = 'Apply all Changes';
        btn.id = 'applybutton';
        btn.onclick = applyChanges;

        out.appendChild(btn);
    } else {
        var para = document.createElement('p');
        para.innerHTML = '<b>Hooray! Your contacts are totally awesome, nothing to change.</b>'
        out.appendChild(para);
    }
}

/**
 * Go through all fields and save the phone number and mail address back to Google Contacts
 */
function applyChanges() {
    var out = document.getElementById('output');
    var fields = out.getElementsByTagName('input');

    // disable the apply button and scroll up
    var btn = document.getElementById('applybutton');
    if (btn.style.display != 'none') {
        btn.style.display = 'none';
        document.getElementById('header').scrollIntoView();
    }

    // go through all phone number / mail address entries
    for (i = 0; i < fields.length; i++) {
        if (fields[i].className == 'done' || fields[i].className == 'pending' || fields[i].className == 'failed') {
            continue;
        } else if ((fields[i].phoneNumber != undefined && fields[i].value == fields[i].phoneNumber.getValue()) && (fields[i].mailAddress != undefined && fields[i].value + " = " + fields[i].mailAddress.getAddress())) {
            //phone numbers are the same, we're done
            fields[i].className = 'done';
        } else {
            fields[i].className = 'pending';
            if (fields[i].phoneNumber != undefined) {
                fields[i].phoneNumber.setValue(fields[i].value);
            }
            if (fields[i].mailAddress != undefined) {
                fields[i].mailAddress.setAddress(fields[i].value);
            }

            fields[i].contactEntry.updateEntry(function() {
                fields[i].className = 'done';
                fields[i].scrollIntoView();
                // run this function again, but no recursion:
                window.setTimeout(applyChanges, 30);
            }, function(e) {
                fields[i].className = 'failed';
                fields[i].title = e;
                fields[i].scrollIntoView();
                // run this function again, but no recursion:
                window.setTimeout(applyChanges, 30);
            }, {
                'etag': '*'
            }); // subsequent phone changes, change etag
            return;
        }
    }
}
/**
 * Clean the given phone number
 */
function phoneClean(number) {
    var prefix = countryprefix + ' ';

    number = number.replace(/[\.\-_()\[\]/\\]/g, ' '); // spaces only
    number = number.replace(/^00/, '+'); // 00 is the plus sign
    number = number.replace(/^0/, prefix); // add prefix
    number = number.replace(/  +/g, ' '); // single spaces only
    // see if we have area codes for that number
    var ctry = RECOUNTRYCODE.exec(number);
    if (ctry && ctry.length) {
        ctry = ctry[1];

        // was an extension marked in the number? remeber it
        var ext = number.match(/ ([0-9][0-9][0-9]?)$/);
        if (ext) ext = ext[1];

        // we have a code - whitespace format on our own
        number = number.replace(/ +/g, '');

        // apply area code format
        var re = new RegExp('^(\\+' + ctry + AREAPREFIX[ctry] + ')');
        number = number.replace(re, '+' + ctry + ' $2 ');

        // reapply extension
        if (ext) {
            re = new RegExp(ext + '$');
            number = number.replace(re, ' ' + ext);
        }
    }
    return number;
}

/**
 * Clean the given mail address
 */
function mailClean(mail) {
    mail = mail.toLowerCase();

    if (mail.search(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i) == -1) {
        return "";
    }

    return mail;
}

/**
 * Callback. Display an error
 */
function handleError(error) {
    var out = document.getElementById('output');
    var err = document.createElement('div');
    err.className = 'error';
    err.innerText = error;
    out.appendChild(err);
}
