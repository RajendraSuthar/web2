<?php
// Demo request form handler (index.html #demoForm).
// Validates the submission, verifies reCAPTCHA, and emails it to MAIL_TO.
// Always responds with JSON: { "success": bool, "message": string }

// ---- Settings ----
const MAIL_TO          = 'rajendra@octopod.co.in';       // inbox that receives demo requests (testing)
const MAIL_CC          = '';                             // optional, comma-separated: 'a@x.com, b@y.com'
const MAIL_FROM        = 'no-reply@studentink.co.in';    // must be an address on your own domain
const RECAPTCHA_SECRET = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // TODO: Google's test secret — replace with your own before going live

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

$subject = 'New demo request: ' . $institution;
$body = "New demo request from studentink.co.in\n\n"
      . "Name:        $name\n"
      . "Phone:       $phone\n"
      . "Email:       $email\n"
      . "Institution: $institution\n"
      . "Type:        $type\n\n"
      . "Message:\n" . ($message !== '' ? $message : '(none)') . "\n\n"
      . '---' . "\n"
      . 'Submitted: ' . date('d M Y, h:i A T') . "\n"
      . 'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";

$headers = [
    'From: Studentink Website <' . MAIL_FROM . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
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

respond(200, true, 'Thank you! Your demo request has been received.');
