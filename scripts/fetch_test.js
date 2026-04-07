const http = require('http');
const req = http.request({
    hostname: '127.0.0.1', port: 3000, path: '/api/patient-chat', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('RESPONSE:', res.statusCode, data));
});
req.on('error', console.error);
req.write(JSON.stringify({
    session_id: '12345678-1234-1234-1234-123456789abc',
    text: 'hello',
    input_method: 'typed',
    language_code: 'en-US'
}));
req.end();
