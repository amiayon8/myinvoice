<?php
ini_set('display_errors',0);
error_reporting(E_ALL);
session_start();
/* ================= SECURITY ================= */

if(empty($_SESSION['csrf_token'])){
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if(empty($_SESSION['form_time'])){
$_SESSION['form_time']=time();
}
/* ================= CAPTCHA (ALPHANUMERIC) ================= */

function generateCaptchaText($length = 6){
    $chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    $text = "";
    for($i=0; $i<$length; $i++){
        $text .= $chars[random_int(0, strlen($chars)-1)];
    }
    return $text;
}

if(!isset($_SESSION['captcha_text']) || isset($_GET['refresh_captcha'])){
    $_SESSION['captcha_text'] = generateCaptchaText();
}
require_once __DIR__ . "/../secure/db_connection.php";
$blocked_ips = [
    '103.86.203.166'
];

if(in_array($_SERVER['REMOTE_ADDR'], $blocked_ips)){
    die("Access denied.");
}
/* ================= VALIDATION ================= */
function is_valid_name($name){
return preg_match("/^[a-zA-Z ]+$/", $name);
}
function is_valid_mobile($num){
return preg_match("/^01[0-9]{9}$/", $num);
}
function is_valid_college($num){
return preg_match("/^[0-9]{11}$/", $num);
}

/* ================= AJAX: COLLEGE CHECK ================= */
if(isset($_GET['ajax']) && $_GET['ajax']=="check_college"){
$cno=mysqli_real_escape_string($conn,$_GET['college_number']);
$q=mysqli_query($conn,"SELECT college_number FROM studentinfo_omr WHERE college_number='$cno'");
echo mysqli_num_rows($q)>0 ? "exists" : "ok";
exit();
}

/* ================= AJAX: LIVE SEARCH ================= */
if(isset($_GET['ajax']) && $_GET['ajax']=="search"){

$where=" WHERE 1 ";

if($_GET['search']!=""){
$s=mysqli_real_escape_string($conn,$_GET['search']);
$where.=" AND college_number LIKE '%$s%'";
}

if($_GET['f_class']!="") $where.=" AND class='".mysqli_real_escape_string($conn,$_GET['f_class'])."'";
if($_GET['f_form']!="") $where.=" AND form='".mysqli_real_escape_string($conn,$_GET['f_form'])."'";
if($_GET['f_group']!="") $where.=" AND group_name='".mysqli_real_escape_string($conn,$_GET['f_group'])."'";
if($_GET['f_medium']!="") $where.=" AND medium='".mysqli_real_escape_string($conn,$_GET['f_medium'])."'";
if($_GET['f_shift']!="") $where.=" AND shift='".mysqli_real_escape_string($conn,$_GET['f_shift'])."'";

$q=mysqli_query($conn,"SELECT * FROM studentinfo_omr $where ORDER BY college_number");

$sl=1;

while($r=mysqli_fetch_assoc($q)){
$id=$r['college_number'];

echo "<tr>
<td>
<input type='checkbox'
name='selected_records[]'
value='{$r['college_number']}'>

</td>
<td>{$sl}</td>
<td>{$r['name']}</td>
<td>{$r['college_number']}</td>
<td>{$r['class']}</td>
<td>{$r['form']}</td>
<td>{$r['group_name']}</td>
<td>{$r['medium']}</td>
<td>{$r['shift']}</td>
<td>{$r['session']}</td>
<td data-contact='{$r['contact']}'>########</td>

<td>
<button class='blue' onclick=\"showEdit('$id')\">Edit</button>

<div id='edit-$id' style='display:none;background:#fff;padding:10px'>
<form method='post'>
<input type='hidden' name='college_number' value='$id'>
<input name='name' value='{$r['name']}'>
<input name='class' value='{$r['class']}'>
<input name='form' value='{$r['form']}'>
<input name='group_name' value='{$r['group_name']}'>
<input name='medium' value='{$r['medium']}'>
<input name='shift' value='{$r['shift']}'>
<input name='session' value='{$r['session']}'>
<input name='contact' value='{$r['contact']}'>
<input type='password' name='edit_password'>
<button class='green' name='update'>Update</button>
</form>
</div>
</td>

<td>
<form method='post' action='?delete=$id' onsubmit='return confirmDelete(this)'>
<input type='hidden' name='delete_password'>
<button class='red'>Delete</button>
</form>
</td>

</tr>";

$sl++;
}
exit();
}

$msg="";

if($_SERVER['REQUEST_METHOD']=="POST" && isset($_POST['save'])){

/* ================= SECURITY CHECKS ================= */

if(
!isset($_POST['csrf_token']) ||
$_POST['csrf_token']!==$_SESSION['csrf_token']
){
die("Invalid request blocked");
}

/* honeypot */
if(!empty($_POST['website'])){
die("Bot blocked");
}

/* too fast */
if(
isset($_POST['form_time']) &&
(time()-intval($_POST['form_time']))<5
){
die("Suspicious activity blocked");
}

/* CAPTCHA CHECK (FIXED FLOW) */
if(
!isset($_POST['captcha']) ||
strtoupper(trim($_POST['captcha'])) !== $_SESSION['captcha_text']
){
    $msg = "❌ Wrong CAPTCHA answer!";
}

/* ================= NORMAL DATA ================= */

$name=trim($_POST['name'] ?? '');
$college_number=trim($_POST['college_number'] ?? '');
$class=$_POST['class'] ?? '';
$form=$_POST['form'] ?? '';
$group_name=$_POST['group_name'] ?? '';
$medium=$_POST['medium'] ?? '';
$shift=$_POST['shift'] ?? '';
$session=$_POST['session'] ?? '';
$contact=trim($_POST['contact'] ?? '');

$ip=$_SERVER['REMOTE_ADDR'];

/* rate limit */
$q=mysqli_query($conn,"
SELECT COUNT(*) c
FROM studentinfo_omr
WHERE created_ip='$ip'
AND created_at >= NOW() - INTERVAL 5 MINUTE
");

$c=mysqli_fetch_assoc($q)['c'];

if($c>=10){
$msg="❌ Too many submissions from this IP. Try again later.";
}
elseif(
$name=="" ||
$college_number=="" ||
$class=="" ||
$form=="" ||
$group_name=="" ||
$medium=="" ||
$shift=="" ||
$session=="" ||
$contact==""
){
$msg="❌ All fields are required!";
}
elseif(!preg_match("/^[a-zA-Z ]+$/",$name)){
$msg="❌ Name must contain only letters!";
}
elseif(!preg_match("/^[0-9]{11}$/",$college_number)){
$msg="❌ College number must be exactly 11 digits!";
}
elseif(!is_valid_mobile($contact)){
$msg="❌ Enter valid mobile number";
}
else{

$check=mysqli_query($conn,"
SELECT college_number
FROM studentinfo_omr
WHERE college_number='$college_number'
");

if(mysqli_num_rows($check)>0){
$msg="❌ Duplicate college number found!";
}
else{

mysqli_query($conn,"
INSERT INTO studentinfo_omr
(
name,
college_number,
class,
form,
group_name,
medium,
shift,
session,
contact,
created_ip
)
VALUES
(
'$name',
'$college_number',
'$class',
'$form',
'$group_name',
'$medium',
'$shift',
'$session',
'$contact',
'$ip'
)
");

$_SESSION['csrf_token']=bin2hex(random_bytes(32));
$_SESSION['form_time']=time();

/* regenerate captcha AFTER success */

$msg="✅ Student saved successfully!";
}
}
}

if(isset($_POST['update'])){

$pass = trim($_POST['edit_password']);

if($pass !== "#ras980227rumc#"){
$msg = "❌ Wrong password!";
}
else{

$college = mysqli_real_escape_string($conn, $_POST['college_number']);
$name = mysqli_real_escape_string($conn, $_POST['name']);
$class = mysqli_real_escape_string($conn, $_POST['class']);
$form = mysqli_real_escape_string($conn, $_POST['form']);
$group = mysqli_real_escape_string($conn, $_POST['group_name']);
$medium = mysqli_real_escape_string($conn, $_POST['medium']);
$shift = mysqli_real_escape_string($conn, $_POST['shift']);
$session = mysqli_real_escape_string($conn, $_POST['session']);
$contact = mysqli_real_escape_string($conn, $_POST['contact']);

mysqli_query($conn,"UPDATE studentinfo_omr SET 
name='$name',
class='$class',
form='$form',
group_name='$group',
medium='$medium',
shift='$shift',
session='$session',
contact='$contact'
WHERE college_number='$college'");

if(mysqli_affected_rows($conn) > 0){
$msg = "✅ Updated successfully!";
} else {
$msg = "⚠ No change detected or update failed!";
}
}
}
/* ================= DELETE ================= */
if(isset($_GET['delete']) && isset($_POST['delete_password'])){

if(trim($_POST['delete_password'])=="#omr.RUMC.2026#"){

$id=mysqli_real_escape_string($conn,$_GET['delete']);

mysqli_query($conn,"DELETE FROM studentinfo_omr WHERE college_number='$id'");

header("Location: studentInfo_for_omr.php");
exit();

}else{

$msg="Wrong password!";

}
}
if(isset($_POST['upload_csv'])){

    if(trim($_POST['csv_password'])!="rumc_1994"){
        $msg="❌ Wrong CSV upload password!";
    }
    elseif(!empty($_FILES['csv_file']['tmp_name'])){

        $handle = fopen($_FILES['csv_file']['tmp_name'], "r");

        if(!$handle){
            $msg="❌ Cannot open CSV file!";
        }
        else{

            fgetcsv($handle); // skip header

            $inserted = 0;
            $updated = 0;
            $failed = 0;

            $ip = $_SERVER['REMOTE_ADDR'];

            while(($data = fgetcsv($handle, 10000, ",")) !== FALSE){

                $name = mysqli_real_escape_string($conn, trim($data[1] ?? ''));
                $college_number = trim($data[0] ?? '');
                $class = mysqli_real_escape_string($conn, trim($data[2] ?? ''));
                $form = mysqli_real_escape_string($conn, trim($data[3] ?? ''));
                $group_name = mysqli_real_escape_string($conn, trim($data[4] ?? ''));
                $medium = mysqli_real_escape_string($conn, trim($data[5] ?? ''));
                $shift = mysqli_real_escape_string($conn, trim($data[6] ?? ''));
                $session = mysqli_real_escape_string($conn, trim($data[7] ?? ''));
                $contact = mysqli_real_escape_string($conn, trim($data[8] ?? ''));

                // clean number
                $college_number = preg_replace('/[^0-9]/','',$college_number);

                // convert 10 digit → 11 digit
                if(strlen($college_number)==10){
                    $college_number = "0".$college_number;
                }

                if($name=='' || $college_number==''){
                    $failed++;
                    continue;
                }

                $sql = "
                INSERT INTO studentinfo_omr
                (
                    
                    college_number,
                    name,
                    class,
                    form,
                    `group_name`,
                    medium,
                    shift,
                    session,
                    contact,
                    created_ip,
                    created_at
                )
                VALUES
                (
                    
                    '$college_number',
                    '$name',
                    '$class',
                    '$form',
                    '$group_name',
                    '$medium',
                    '$shift',
                    '$session',
                    '$contact',
                    '$ip',
                    NOW()
                )
                ON DUPLICATE KEY UPDATE
                    name=VALUES(name),
                    class=VALUES(class),
                    form=VALUES(form),
                    `group_name`=VALUES(`group_name`),
                    medium=VALUES(medium),
                    shift=VALUES(shift),
                    session=VALUES(session),
                    contact=VALUES(contact),
                    created_ip=VALUES(created_ip),
                    created_at=NOW()
                ";

                $result = mysqli_query($conn, $sql);

                if(!$result){
                    echo "❌ SQL ERROR: " . mysqli_error($conn) . "<br>";
                    $failed++;
                    continue;
                }

                if(mysqli_affected_rows($conn) == 1){
                    $inserted++;
                } else {
                    $updated++;
                }
            }

            fclose($handle);

            $msg = "✅ Upload complete → Inserted: $inserted | Updated: $updated | Failed: $failed";
        }

    } else {
        $msg="❌ No file selected!";
    }
}
/* ================= BULK DELETE ================= */
if(isset($_POST['bulk_delete'])){

    if(trim($_POST['bulk_delete_password'])=="#omr.RUMC.2026#"){

        if(!empty($_POST['selected_records'])){

            $ids = array_map(function($v) use ($conn){
                return "'" . mysqli_real_escape_string($conn,$v) . "'";
            }, $_POST['selected_records']);

            $idList = implode(",", $ids);

            mysqli_query(
                $conn,
                "DELETE FROM studentinfo_omr
                 WHERE college_number IN ($idList)"
            );

            $msg = "✅ Selected records deleted successfully!";
        }else{
            $msg = "❌ No record selected!";
        }

    }else{
        $msg = "❌ Wrong password!";
    }
}
/* ================= FILTER ================= */
$search=$_GET['search'] ?? '';
$f_class=$_GET['f_class'] ?? '';
$f_form=$_GET['f_form'] ?? '';
$f_group=$_GET['f_group'] ?? '';
$f_medium=$_GET['f_medium'] ?? '';
$f_shift=$_GET['f_shift'] ?? '';

$where=" WHERE 1 ";
if($search!="") $where.=" AND college_number LIKE '%$search%'";
if($f_class!="") $where.=" AND class='$f_class'";
if($f_form!="") $where.=" AND form='$f_form'";
if($f_group!="") $where.=" AND group_name='$f_group'";
if($f_medium!="") $where.=" AND medium='$f_medium'";
if($f_shift!="") $where.=" AND shift='$f_shift'";
/* ================= EXCEL DOWNLOAD ================= */
/* ================= EXCEL DOWNLOAD PASSWORD PROTECTED ================= */
if(isset($_GET['export']) && $_GET['export']=="excel"){

if(($_GET['download_password'] ?? '')!="rumc_1994"){
die("Wrong password");
}

$type = $_GET['type'] ?? 'all';

$whereExport = " WHERE 1 ";

if($type=="filtered"){

if(!empty($_GET['search'])){
$s=mysqli_real_escape_string($conn,$_GET['search']);
$whereExport .= " AND college_number LIKE '%$s%'";
}

if(!empty($_GET['f_class'])){
$v=mysqli_real_escape_string($conn,$_GET['f_class']);
$whereExport .= " AND class='$v'";
}

if(!empty($_GET['f_form'])){
$v=mysqli_real_escape_string($conn,$_GET['f_form']);
$whereExport .= " AND form='$v'";
}

if(!empty($_GET['f_group'])){
$v=mysqli_real_escape_string($conn,$_GET['f_group']);
$whereExport .= " AND group_name='$v'";
}

if(!empty($_GET['f_medium'])){
$v=mysqli_real_escape_string($conn,$_GET['f_medium']);
$whereExport .= " AND medium='$v'";
}

if(!empty($_GET['f_shift'])){
$v=mysqli_real_escape_string($conn,$_GET['f_shift']);
$whereExport .= " AND shift='$v'";
}
}

header("Content-Type: application/vnd.ms-excel; charset=utf-8");
header("Content-Disposition: attachment; filename=studentinfo_omr.xls");

echo "SL\tName\tCollege Number\tClass\tForm\tGroup\tMedium\tShift\tSession\tContact\n";

$qx=mysqli_query($conn,"SELECT * FROM studentinfo_omr $whereExport ORDER BY college_number");

$sl=1;
while($r=mysqli_fetch_assoc($qx)){

echo $sl."\t".
$r['name']."\t".
$r['college_number']."\t".
$r['class']."\t".
$r['form']."\t".
$r['group_name']."\t".
$r['medium']."\t".
$r['shift']."\t".
$r['session']."\t".
$r['contact']."\n";

$sl++;
}
exit();
}/* ================= CSV DOWNLOAD ================= */
if(isset($_GET['download'])){

if(($_GET['download_password'] ?? '')!="rumc_1994"){
die("Wrong password");
}

$type = $_GET['download'];

$whereExport = " WHERE 1 ";

if($type=="filtered"){

if(!empty($_GET['search'])){
$s=mysqli_real_escape_string($conn,$_GET['search']);
$whereExport .= " AND college_number LIKE '%$s%'";
}

if(!empty($_GET['f_class'])){
$v=mysqli_real_escape_string($conn,$_GET['f_class']);
$whereExport .= " AND class='$v'";
}

if(!empty($_GET['f_form'])){
$v=mysqli_real_escape_string($conn,$_GET['f_form']);
$whereExport .= " AND form='$v'";
}

if(!empty($_GET['f_group'])){
$v=mysqli_real_escape_string($conn,$_GET['f_group']);
$whereExport .= " AND group_name='$v'";
}

if(!empty($_GET['f_medium'])){
$v=mysqli_real_escape_string($conn,$_GET['f_medium']);
$whereExport .= " AND medium='$v'";
}

if(!empty($_GET['f_shift'])){
$v=mysqli_real_escape_string($conn,$_GET['f_shift']);
$whereExport .= " AND shift='$v'";
}
}

header('Content-Type:text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=studentinfo_omr.csv');

$output=fopen('php://output','w');

fputcsv($output,[
'SL','Name','College Number','Class','Form','Group','Medium','Shift','Session','Contact'
]);

$qx=mysqli_query($conn,"SELECT * FROM studentinfo_omr $whereExport ORDER BY college_number");

$sl=1;
while($r=mysqli_fetch_assoc($qx)){
fputcsv($output,[
$sl++,
$r['name'],
$r['college_number'],
$r['class'],
$r['form'],
$r['group_name'],
$r['medium'],
$r['shift'],
$r['session'],
$r['contact']
]);
}

fclose($output);
exit();
}

/* ================= FORM WISE ENTRY ================= */

$formWiseRows=[];
$formWiseTotal=0;

if(
isset($_GET['show_formwise']) &&
($_GET['view_password'] ?? '')=="rumc_1994"
){

$q=mysqli_query($conn,"
SELECT
class,
group_name,
form,
medium,
shift,
COUNT(*) AS total
FROM studentinfo_omr
GROUP BY
class,
group_name,
form,
medium,
shift

ORDER BY
FIELD(class,'IX','X','XI','XII'),
FIELD(group_name,'Science','B.Std','Hum'),
form,
FIELD(medium,'Bangla','English'),
FIELD(shift,'Morning','Day')
");

while($r=mysqli_fetch_assoc($q)){
$formWiseRows[]=$r;
$formWiseTotal += $r['total'];
}

}
/* ================= LOAD ================= */

$rows=[];

$total=mysqli_fetch_assoc(
mysqli_query($conn,"SELECT COUNT(*) total FROM studentinfo_omr")
)['total'];
$cntIX = mysqli_fetch_assoc(mysqli_query($conn,"SELECT COUNT(*) as c FROM studentinfo_omr WHERE class='IX'"))['c'];
$cntX  = mysqli_fetch_assoc(mysqli_query($conn,"SELECT COUNT(*) as c FROM studentinfo_omr WHERE class='X'"))['c'];
$cntXI = mysqli_fetch_assoc(mysqli_query($conn,"SELECT COUNT(*) as c FROM studentinfo_omr WHERE class='XI'"))['c'];
$cntXII= mysqli_fetch_assoc(mysqli_query($conn,"SELECT COUNT(*) as c FROM studentinfo_omr WHERE class='XII'"))['c'];
if(
isset($_GET['showall']) ||
$search!="" ||
$f_class!="" ||
$f_form!="" ||
$f_group!="" ||
$f_medium!="" ||
$f_shift!=""
){

$q=mysqli_query($conn,"
SELECT * FROM studentinfo_omr
$where
ORDER BY college_number
");

while($r=mysqli_fetch_assoc($q)){
$rows[]=$r;
}

}
?>

<!DOCTYPE html>
<html>
<head>
<title>OMR System</title>

<style>
body{font-family:Arial;background:#f4f4f4;}
input,select{padding:6px;margin:3px;}
button{padding:6px 10px;border:0;cursor:pointer;}
.green{background:green;color:#fff;}
.blue{background:#0066cc;color:#fff;}
.red{background:red;color:#fff;}

table{width:100%;border-collapse:collapse;background:#fff;}
th,td{border:1px solid #ddd;padding:6px;}

@media(max-width:768px){
table,thead,tbody,tr,td{display:block;}
td{border:none;border-bottom:1px solid #ddd;}
}
</style>

<script>
function showEdit(id){
    let p = prompt("Enter password:");

    if(p === null) return;

    // 🔥 IMPORTANT FIX
    p = p.trim();

    if(p !== "#ras980227rumc#"){
        alert("Wrong Worng password");
        return;
    }

    let box = document.getElementById("edit-"+id);

    if(!box){
        alert("Edit box not found!");
        return;
    }

    // optional: close others
    document.querySelectorAll("[id^='edit-']").forEach(el=>{
        el.style.display = "none";
    });

    box.style.display = "block";
}
function confirmDelete(form){

let p = prompt("Enter password to delete:");

if(p === null){
return false;
}

form.delete_password.value = p.trim();

return true;
}
function runSearch(){

let p=new URLSearchParams();

p.set("ajax","search");
p.set("search",document.querySelector("[name=search]").value);
p.set("f_class",document.querySelector("[name=f_class]").value);
p.set("f_form",document.querySelector("[name=f_form]").value);
p.set("f_group",document.querySelector("[name=f_group]").value);
p.set("f_medium",document.querySelector("[name=f_medium]").value);
p.set("f_shift",document.querySelector("[name=f_shift]").value);

fetch("studentInfo_for_omr.php?"+p.toString())
.then(r=>r.text())
.then(d=>{
document.getElementById("tbody").innerHTML=d;
});
}

function resetFilters(){
document.querySelector("[name=search]").value="";
document.querySelector("[name=f_class]").value="";
document.querySelector("[name=f_form]").value="";
document.querySelector("[name=f_group]").value="";
document.querySelector("[name=f_medium]").value="";
document.querySelector("[name=f_shift]").value="";

runSearch();
}
function showAllRecords(){

let p=new URLSearchParams();

p.set("showall","1");

window.location="studentInfo_for_omr.php?"+p.toString();

}
function downloadExcel(type){

let pass=prompt("Enter download password:");

if(pass!=="rumc_1994"){
alert("Wrong password");
return;
}

let p=new URLSearchParams();

p.set("export","excel");
p.set("type",type);
p.set("download_password",pass);

p.set("search",document.querySelector("[name=search]").value);
p.set("f_class",document.querySelector("[name=f_class]").value);
p.set("f_form",document.querySelector("[name=f_form]").value);
p.set("f_group",document.querySelector("[name=f_group]").value);
p.set("f_medium",document.querySelector("[name=f_medium]").value);
p.set("f_shift",document.querySelector("[name=f_shift]").value);

window.location="studentInfo_for_omr.php?"+p.toString();
}

function downloadCSV(type){

let pass=prompt("Enter download password:");
if(pass!=="rumc_1994"){
alert("Wrong password");
return;
}

let p=new URLSearchParams();

p.set("download",type);
p.set("download_password",pass);

p.set("search",document.querySelector("[name=search]").value);
p.set("f_class",document.querySelector("[name=f_class]").value);
p.set("f_form",document.querySelector("[name=f_form]").value);
p.set("f_group",document.querySelector("[name=f_group]").value);
p.set("f_medium",document.querySelector("[name=f_medium]").value);
p.set("f_shift",document.querySelector("[name=f_shift]").value);

window.location="studentInfo_for_omr.php?"+p.toString();
}
function validateForm(e){

e = e || window.event;

let f = document.getElementById("addForm");

let name = f.name.value.trim();
let college = f.college_number.value.trim();
let cls = f.class.value;
let form = f.form.value;
let group = f.group_name.value;
let medium = f.medium.value;
let shift = f.shift.value;
let session = f.session.value;
let contact = f.contact.value.trim();

if(!name || !college || !cls || !form || !group || !medium || !shift || !session){
alert("❌ Please fill all fields!");
e.preventDefault();
return false;
}

if(!/^[a-zA-Z ]+$/.test(name)){
alert("❌ Name must contain only letters!");
e.preventDefault();
return false;
}

if(!/^[0-9]{11}$/.test(college)){
alert("❌ College number must be 11 digits!");
e.preventDefault();
return false;
}

/* ask mobile before save */
if(contact===""){
contact = prompt("Enter mobile number (01#########):");

if(contact===null){
e.preventDefault();
return false;
}

f.contact.value = contact.trim();
}

/* BD mobile validation */
if(!/^01[0-9]{9}$/.test(f.contact.value.trim())){
alert("❌ Enter valid mobile number like 01712345678");
e.preventDefault();
return false;
}

return true;
}
function showAllProtected(){
    let pass = prompt("Enter password to view all records:");

    if(pass === null){
        return; // user pressed cancel
    }

    if(pass === "rumc_1994"){
        showAllRecords();
    }else{
        alert("Incorrect password!");
    }
}
function showFormWiseEntry(){

let pass = prompt("Enter password to view form wise entry:");

if(pass===null) return;

if(pass!=="rumc_1994"){
alert("Wrong password");
return;
}

let p=new URLSearchParams();

p.set("show_formwise","1");
p.set("view_password",pass);

window.location="studentInfo_for_omr.php?"+p.toString();

}
function refreshCaptcha(){
    fetch("studentInfo_for_omr.php?refresh_captcha=1")
    .then(() => {
        location.reload();
    });
}
function toggleAll(source){

document
.querySelectorAll("input[name='selected_records[]']")
.forEach(function(cb){
cb.checked = source.checked;
});

}

function bulkDeleteSelected(){

let checked =
document.querySelectorAll(
"input[name='selected_records[]']:checked"
);

if(checked.length===0){
alert("Please select record(s).");
return;
}

let pass =
prompt("Enter password:");

if(pass===null){
return;
}

document.getElementById(
"bulk_delete_password"
).value = pass.trim();

if(confirm(
"Do you want to delete "
+ checked.length +
" record(s)?"
)){
document.getElementById(
"bulkDeleteForm"
).submit();
}

}
function singleDelete(id){

    let pass = prompt("Enter password to delete:");

    if(pass===null){
        return;
    }

    if(!confirm("Delete this record?")){
        return;
    }

    let f = document.createElement("form");
    f.method = "post";
    f.action = "?delete=" + id;

    let p = document.createElement("input");
    p.type = "hidden";
    p.name = "delete_password";
    p.value = pass;

    f.appendChild(p);

    document.body.appendChild(f);

    f.submit();
}
function editSelected(){

    let checked =
    document.querySelectorAll(
    "input[name='selected_records[]']:checked"
    );

    if(checked.length!==1){
        alert("Please select exactly ONE record.");
        return;
    }

    let row = checked[0].closest("tr");

    let contact =
    row.cells[10].getAttribute("data-contact");

    openEditModal(
        row.cells[3].innerText,
        row.cells[2].innerText,
        row.cells[4].innerText,
        row.cells[5].innerText,
        row.cells[6].innerText,
        row.cells[7].innerText,
        row.cells[8].innerText,
        row.cells[9].innerText,
        contact
    );
}
function openEditModal(
college,
name,
cls,
form,
group,
medium,
shift,
session,
contact
){

document.getElementById("e_college").value = college;
document.getElementById("e_name").value = name;
document.getElementById("e_class").value = cls;
document.getElementById("e_form").value = form;
document.getElementById("e_group").value = group;
document.getElementById("e_medium").value = medium;
document.getElementById("e_shift").value = shift;
document.getElementById("e_session").value = session;
document.getElementById("e_contact").value = contact;

document.getElementById("editModal").style.display="block";

}
function toggleAll(source){

document
.querySelectorAll(
"input[name='selected_records[]']"
)
.forEach(function(cb){

cb.checked = source.checked;

});

}
</script>

</head>

<body>

<!-- ================= PROFESSIONAL HEADER WITH STATS ================= -->
<div style="
background: linear-gradient(135deg,#0f172a,#1e3a8a);
color:white;
padding:22px 18px;
border-radius:14px;
box-shadow:0 10px 25px rgba(0,0,0,0.25);
margin-bottom:20px;
font-family:Arial;
">

<div style="text-align:center;">

<div style="font-size:22px;font-weight:700;letter-spacing:.5px;">
🏫 Rajuk Uttara Model College
</div>

<div style="margin-top:6px;font-size:16px;color:#cbd5e1;">
OMR Scanning & Processing Management System
</div>

<div style="margin-top:10px;">
<span style="
background:#22c55e;
padding:6px 14px;
border-radius:20px;
font-size:13px;
font-weight:600;
">
Total Records: <?php echo $total; ?>
</span>
</div>

<!-- ================= QUICK STATS ================= -->
<div style="
display:flex;
justify-content:center;
gap:10px;
flex-wrap:wrap;
margin-top:14px;
">

<div style="background:#2563eb;padding:8px 14px;border-radius:10px;">
IX: <?php echo $cntIX; ?>
</div>

<div style="background:#16a34a;padding:8px 14px;border-radius:10px;">
X: <?php echo $cntX; ?>
</div>

<div style="background:#f59e0b;padding:8px 14px;border-radius:10px;">
XI: <?php echo $cntXI; ?>
</div>

<div style="background:#ef4444;padding:8px 14px;border-radius:10px;">
XII: <?php echo $cntXII; ?>
</div>

</div>

</div>

</div>

<div style="margin-top:10px;">
<span style="
background:#22c55e;
padding:6px 14px;
border-radius:20px;
font-size:13px;
font-weight:600;
">
Total Records: <?php echo $total; ?>
</span>
</div>

</div>

</div>

<?php echo $msg; ?>

<!-- ================= ADD STUDENT FORM ================= -->
<div style="
background:#ffffff;
padding:20px;
border-radius:14px;
box-shadow:0 6px 18px rgba(0,0,0,0.08);
margin-bottom:20px;
font-family:Arial;
">

<div style="font-size:16px;font-weight:700;margin-bottom:14px;color:#0f172a;">
➕ Add New Student
</div>

<form id="addForm" method="post" onsubmit="return validateForm(event)">

<input type="hidden"
name="csrf_token"
value="<?php echo $_SESSION['csrf_token']; ?>">

<input type="hidden"
name="form_time"
value="<?php echo $_SESSION['form_time']; ?>">

<div style="display:none;">
<input type="text"
name="website"
autocomplete="off">
</div>

<!-- NAME -->
<input name="name" placeholder="👤 Full Name"
style="padding:10px;border-radius:8px;border:1px solid #ccc;min-width:180px;">

<!-- COLLEGE NUMBER -->
<input name="college_number" placeholder="🎓 11 Digit College No"
style="padding:10px;border-radius:8px;border:1px solid #ccc;min-width:180px;">

<!-- CLASS -->
<select name="class" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">📘 Class</option>
<option>IX</option>
<option>X</option>
<option>XI</option>
<option>XII</option>
</select>

<!-- FORM -->
<select name="form" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">🅰 Form</option>
<option>A</option><option>B</option><option>C</option>
<option>D</option><option>E</option><option>F</option>
</select>

<!-- GROUP -->
<select name="group_name" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">🧪 Group</option>
<option>Science</option>
<option>B.Std</option>
<option>Hum</option>
</select>

<!-- MEDIUM -->
<select name="medium" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">🌐 Medium</option>
<option>Bangla</option>
<option>English</option>
</select>

<!-- SHIFT -->
<select name="shift" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">⏰ Shift</option>
<option>Morning</option>
<option>Day</option>
</select>

<!-- SESSION -->
<select name="session" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">📅 Session</option>
<option>2025-2026</option>
<option>2026-2027</option>
</select> 

<!-- CONTACT -->
<input name="contact" placeholder="📞 11 Digit Contact"
style="padding:10px;border-radius:8px;border:1px solid #ccc;min-width:180px;">

<!-- CAPTCHA -->
<div style="margin-top:10px;">

<label style="font-weight:600;">
🧩 CAPTCHA:
<span style="
display:inline-block;
padding:6px 12px;
background:#111;
color:#00ff88;
font-size:18px;
letter-spacing:3px;
border-radius:6px;
">
<?php echo $_SESSION['captcha_text']; ?>
</span>
</label>

<br><br>

<input name="captcha"
placeholder="Enter CAPTCHA"
required
style="padding:10px;border-radius:8px;border:1px solid #ccc;min-width:150px;">

<button type="button" onclick="refreshCaptcha()"
style="
padding:8px 12px;
background:#2563eb;
color:#fff;
border:none;
border-radius:6px;
cursor:pointer;
margin-left:10px;
">
🔄 Refresh
</button>

</div>
<!-- SAVE BUTTON -->
<button type="submit" name="save"
onclick="return validateForm(event)"
style="  
background:linear-gradient(135deg,#16a34a,#22c55e);
color:white;
padding:10px 16px;
border:none;
border-radius:8px;
cursor:pointer;
font-weight:700;
box-shadow:0 4px 10px rgba(34,197,94,0.3);
">
💾 Save Student
</button>

</form>

</div>

<hr>

<!-- ================= PROFESSIONAL SEARCH PANEL ================= -->
<div style="
background:#ffffff;
padding:18px;
border-radius:14px;
box-shadow:0 6px 18px rgba(0,0,0,0.08);
margin-bottom:18px;
font-family:Arial;
">

<div style="font-size:16px;font-weight:700;margin-bottom:12px;color:#0f172a;">
🔍 Search & Filter Students
</div>

<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">

<!-- SEARCH -->
<input name="search"
placeholder="🔎 Search by College Number"
style="padding:10px;border-radius:8px;border:1px solid #ccc;min-width:200px;">

<select name="f_class" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">📘 Class</option>
<option>IX</option>
<option>X</option>
<option>XI</option>
<option>XII</option>
</select>

<select name="f_form" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">🅰 Form</option>
<option>A</option><option>B</option><option>C</option>
<option>D</option><option>E</option><option>F</option>
</select>

<select name="f_group" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">🧪 Group</option>
<option>Science</option>
<option>B.Std</option>
<option>Hum</option>
</select>

<select name="f_medium" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">🌐 Medium</option>
<option>Bangla</option>
<option>English</option>
</select>

<select name="f_shift" style="padding:10px;border-radius:8px;border:1px solid #ccc;">
<option value="">⏰ Shift</option>
<option>Morning</option>
<option>Day</option>
</select>
<button type="button"
onclick="runSearch()"
style="background:#16a34a;color:white;padding:10px 14px;border:none;border-radius:8px;cursor:pointer;">
🔍 Search
</button>

<button type="button"
onclick="resetFilters()"
style="background:#dc2626;color:white;padding:10px 14px;border:none;border-radius:8px;cursor:pointer;">
♻ Reset
</button>
<!-- SHOW ALL -->
<button type="button"
onclick="showAllProtected()"
style="
background:#1d4ed8;
color:white;
padding:10px 14px;
border:none;
border-radius:8px;
cursor:pointer;
font-weight:600;">
Show All
</button>
<button type="button"
onclick="showFormWiseEntry()"
style="
background:#9333ea;
color:white;
padding:10px 14px;
border:none;
border-radius:8px;
cursor:pointer;
font-weight:600;">
Show Form Wise Entry
</button>
</div>

</div>
<br><br>

<!-- ================= DOWNLOAD BUTTONS ================= -->
<br>

<button type="button" class="green" onclick="downloadExcel('all')">
⬇ Download Excel (All)
</button>

<button type="button" class="blue" onclick="downloadExcel('filtered')">
⬇ Download Excel (Filtered)
</button>

<button type="button" class="green" onclick="downloadCSV('all')">
⬇ Download CSV (All)
</button>

<button type="button" class="blue" onclick="downloadCSV('filtered')">
⬇ Download CSV (Filtered)
</button>
<button type="button"
onclick="document.getElementById('csvUploadBox').style.display='block';"
style="
background:#9333ea;
color:white;
padding:10px 14px;
border:none;
border-radius:8px;
cursor:pointer;
font-weight:600;
">
⬆ Upload CSV
</button>

<div id="csvUploadBox"
style="
display:none;
margin-top:15px;
background:#fff;
padding:15px;
border-radius:12px;
">

<form method="post" enctype="multipart/form-data">

<input type="file"
name="csv_file"
accept=".csv"
required>

<input type="password"
name="csv_password"
placeholder="Enter password"
required>

<button type="submit"
name="upload_csv"
class="green">

Upload Now

</button>

</form>

</div>
<button type="button" class="blue" onclick="editSelected()">
    ✏ Edit Selected
</button>
<!-- ================= BULK ACTION FORM ================= -->

<form method="post" id="bulkDeleteForm">

<div style="margin-bottom:10px;">

<button type="button"
class="blue"
onclick="editSelected()">
✏ Edit Selected
</button>

<button type="button"
class="red"
onclick="bulkDeleteSelected()">
🗑 Delete Selected
</button>

<input type="hidden"
name="bulk_delete_password"
id="bulk_delete_password">

<input type="hidden"
name="bulk_delete"
value="1">

</div>

<table>

<thead>

<tr>
<th>
<input type="checkbox"
id="checkAll"
onclick="toggleAll(this)">
</th>

<th>SL</th>
<th>Name</th>
<th>College</th>
<th>Class</th>
<th>Form</th>
<th>Group</th>
<th>Medium</th>
<th>Shift</th>
<th>Session</th>
<th>Contact</th>
<th>Edit</th>
<th>Delete</th>
</tr>

</thead>

<tbody id="tbody">

<?php
$sl=1;

foreach($rows as $r){

$id=$r['college_number'];
?>

<tr>

<td>
<input type="checkbox"
name="selected_records[]"
value="<?= $id ?>">
</td>

<td><?= $sl++ ?></td>

<td><?= htmlspecialchars($r['name']) ?></td>

<td><?= htmlspecialchars($r['college_number']) ?></td>

<td><?= htmlspecialchars($r['class']) ?></td>

<td><?= htmlspecialchars($r['form']) ?></td>

<td><?= htmlspecialchars($r['group_name']) ?></td>

<td><?= htmlspecialchars($r['medium']) ?></td>

<td><?= htmlspecialchars($r['shift']) ?></td>

<td><?= htmlspecialchars($r['session']) ?></td>

<td><?= htmlspecialchars($r['contact']) ?></td>

<td>

<button
type="button"
class="blue"
onclick="openEditModal(
'<?= addslashes($r['college_number']) ?>',
'<?= addslashes($r['name']) ?>',
'<?= addslashes($r['class']) ?>',
'<?= addslashes($r['form']) ?>',
'<?= addslashes($r['group_name']) ?>',
'<?= addslashes($r['medium']) ?>',
'<?= addslashes($r['shift']) ?>',
'<?= addslashes($r['session']) ?>',
'<?= addslashes($r['contact']) ?>'
)">
Edit
</button>

</td>

<td>

<button
type="button"
class="red"
onclick="singleDelete('<?= $id ?>')">
Delete
</button>

</td>

</tr>

<?php } ?>

</tbody>

</table>

</form>
</div>
<?php if(!empty($formWiseRows)){ ?>
<br><br>

<div style="background:#fff;padding:18px;border-radius:14px;">

<h3>📊 Form Wise Entry Summary</h3>

<table>
<thead>
<tr>
<th>Class</th>
<th>Group</th>
<th>Form</th>
<th>Medium</th>
<th>Shift</th>
<th>Total</th>
</tr>
</thead>

<tbody>
<?php foreach($formWiseRows as $rw){ ?>
<tr>
<td><?= $rw['class'] ?></td>
<td><?= $rw['group_name'] ?></td>
<td><?= $rw['form'] ?></td>
<td><?= $rw['medium'] ?></td>
<td><?= $rw['shift'] ?></td>
<td><b><?= $rw['total'] ?></b></td>
</tr>
<?php } ?>

<tr>
<td colspan="5"><b>Grand Total</b></td>
<td><b><?= $formWiseTotal ?></b></td>
</tr>

</tbody>
</table>

</div>
<?php } ?>

</div>

<div id="editModal" style="display:none;position:fixed;top:10%;left:50%;transform:translateX(-50%);
background:#fff;padding:20px;border:1px solid #ccc;z-index:9999;width:320px;">

<form method="post">

<input type="hidden" name="college_number" id="e_college">

<input name="name" id="e_name">
<input name="class" id="e_class">
<input name="form" id="e_form">
<input name="group_name" id="e_group">
<input name="medium" id="e_medium">
<input name="shift" id="e_shift">
<input name="session" id="e_session">
<input name="contact" id="e_contact">

<input type="password" name="edit_password" placeholder="Password" required>

<br><br>

<button class="green" name="update">Update</button>
<button type="button" onclick="document.getElementById('editModal').style.display='none'">Close</button>

</form>
</div>
<footer style="
margin-top:40px;
padding:28px 20px;
background:linear-gradient(135deg,#17324d,#0f4c75);
color:white;
text-align:center;
border-radius:14px;
box-shadow:0 8px 24px rgba(0,0,0,.18);
font-family:Arial,sans-serif;
">

<div style="font-size:24px;font-weight:700;letter-spacing:.5px;margin-bottom:8px;">
OMR Scanning and Processing System
</div>

<div style="font-size:18px;color:#dbeafe;margin-bottom:14px;">
Need Help?
</div>

<div style="font-size:17px;line-height:1.9;">
<b>Contact:</b> Dr. Rashedul Islam<br>
Associate Professor of ICT (EMMS)<br>
Mobile: 01713099575
</div>

<div style="
margin-top:16px;
font-size:13px;
color:#cbd5e1;
border-top:1px solid rgba(255,255,255,.18);
padding-top:12px;
">
Rajuk Uttara Model College • OMR Management Support Desk
</div>

</footer>
</body>
</html>