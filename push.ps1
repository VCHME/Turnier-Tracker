param(
  [Parameter(Mandatory=$true)][string]$Remote,
  [string]$Message = "Version 1.3.3"
)
git init
git branch -M main
try { git remote remove origin } catch {}
git remote add origin $Remote
git add .
git commit -m $Message
git push -u origin main
