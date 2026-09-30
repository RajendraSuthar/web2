<?php
// Demo request form handler (index.html #demoForm).
// Validates the submission, verifies reCAPTCHA, and emails it (HTML) to MAIL_TO / MAIL_CC.
// Same recipients and email layout as the old site's contact-us.php.
// Always responds with JSON: { "success": bool, "message": string }

// ---- Settings ----
const MAIL_TO          = 'sales@studentink.co.in';       // inbox that receives demo requests
const MAIL_CC          = 'nihar@studentink.co.in';       // optional, comma-separated: 'a@x.com, b@y.com'
const MAIL_FROM        = 'no-reply@studentink.co.in';    // must be an address on your own domain
const RECAPTCHA_SECRET = '6Lde2n8rAAAAAM7o9ra4WXpUzwdM7iclSamuGMS8'; // pairs with data-sitekey in index.html

date_default_timezone_set('Asia/Kolkata');
header('Content-Type: application/json; charset=utf-8');

function respond(int $status, bool $success, string $message): void
{
    http_response_code($status);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

function field(string $key, int $maxLength = 200): string
{
    $value = trim((string)($_POST[$key] ?? ''));
    return mb_substr($value, 0, $maxLength);
}

// Strip line breaks so user input can never inject extra mail headers.
function one_line(string $value): string
{
    return trim(preg_replace('/[\r\n]+/', ' ', $value));
}

function verify_recaptcha(string $token): bool
{
    $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'secret'   => RECAPTCHA_SECRET,
            'response' => $token,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $body = curl_exec($ch);
    curl_close($ch);

    $result = $body ? json_decode($body, true) : null;
    return !empty($result['success']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, false, 'Method not allowed.');
}

if (strpos(MAIL_TO, 'CHANGE_ME') !== false) {
    respond(500, false, 'The contact form is not configured yet.');
}

// honeypot: real users never fill this, bots often do — pretend it worked
if (field('botcheck') !== '') {
    respond(200, true, 'Thank you!');
}

$name        = one_line(field('name', 100));
$phone       = one_line(field('phone', 20));
$email       = one_line(field('email', 150));
$institution = one_line(field('institution', 150));
$type        = one_line(field('type', 50));
$message     = field('message', 3000);

if ($name === '' || $phone === '' || $email === '' || $institution === '' || $type === '') {
    respond(422, false, 'Please fill in all required fields.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, false, 'Please enter a valid email address.');
}
if (!preg_match('/^[0-9+\-\s()]{7,20}$/', $phone)) {
    respond(422, false, 'Please enter a valid phone number.');
}

$token = (string)($_POST['g-recaptcha-response'] ?? '');
if ($token === '' || !verify_recaptcha($token)) {
    respond(422, false, "Please confirm you're not a robot.");
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$subject = 'New Inquiry From ' . $name;
$body = "<html><body style=\"margin:0;padding:40px;background:#f4f7f9;font-family:Arial,sans-serif;font-size:15px;\">"
      . "<div style=\"max-width:600px;margin:auto;background:#ffffff;padding:30px;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.1);text-align:center;\">"
      . "<div style=\"margin-bottom:20px;\"><img src=\"https://octopods3.s3.ap-south-1.amazonaws.com/placeholder/studentink_logo.png\" alt=\"Studentink\" style=\"width:220px;\"></div>"
      . "<h2 style=\"color:#5ba2ef;margin:0 0 10px;font-weight:700;\">New Inquiry Received!</h2>"
      . "<div style=\"text-align:left;background:#f9f9f9;padding:15px;border-radius:8px;margin-top:20px;\">"
      . '<p><strong>Name:</strong> ' . h($name) . '</p>'
      . '<p><strong>Email:</strong> <a href="mailto:' . h($email) . '" style="color:#000;text-decoration:none;">' . h($email) . '</a></p>'
      . '<p><strong>Phone:</strong> ' . h($phone) . '</p>'
      . '<p><strong>Institution:</strong> ' . h($institution) . '</p>'
      . '<p><strong>Institution type:</strong> ' . h($type) . '</p>'
      . '<p><strong>Message:</strong><br>' . ($message !== '' ? nl2br(h($message)) : '(none)') . '</p>'
      . '</div>'
      . '<p style="margin-top:20px;font-size:12px;color:#95a5a6;">Submitted ' . date('d M Y, h:i A T')
      . ' · IP ' . h($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '<br>'
      . 'Copyright &copy; 2018 - ' . date('Y') . ' Jaynik Eduserve Private Limited | All Rights Reserved</p>'
      . '</div></body></html>';

$headers = [
    'From: Studentink Website <' . MAIL_FROM . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
];
if (MAIL_CC !== '') {
    $headers[] = 'Cc: ' . MAIL_CC;
}
$headers = implode("\r\n", $headers);

$sent = mail(
    MAIL_TO,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    $headers,
    '-f' . MAIL_FROM
);

if (!$sent) {
    respond(500, false, 'Sorry, we could not send your request. Please try again in a moment.');
}

respond(200, true, 'Thank you for requesting a demo, you will get a call in the next 24 hours.');
