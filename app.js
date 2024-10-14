import fetch from 'node-fetch';
import https from 'https';
import fs from 'fs';
const clientId = process.argv[2]; 
const clientSecret = process.argv[3]; 
const code = process.argv[4]; 
const body = `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=authorization_code&code=${encodeURIComponent(code)}`;
function getAccessToken() {
    return fetch('https://login.wrike.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    })
        .then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                throw new Error(`Error: ${res.status}, answer: ${text}`);
            });
        }
        return res.json();
    })
        .then(data => data.access_token);
}
function getTasks(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.wrike.com',
            path: '/api/v4/tasks',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const tasks = JSON.parse(data).data;
                const formattedTasks = tasks.map(task => ({
                    id: task.id,
                    name: task.title,
                    assignee: task.accountId,
                    status: task.importance,
                    collections: task.parentIds,
                    created_at: task.createdDate,
                    updated_at: task.updatedDate,
                    ticket_url: task.permalink
                }));
                fs.writeFile('tasks.json', JSON.stringify(formattedTasks, null, 2), (err) => {
                    if (err)
                        return reject('Error with file: ' + err);
                    resolve(formattedTasks);
                });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

getAccessToken()
    .then(accessToken => getTasks(accessToken))
    .then(tasks => console.log('Tasks:', tasks))
    .catch(err => console.error('Error:', err));
