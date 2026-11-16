# Start here: lane 3, open data and the passenger page (Devin, started by Mustafo)

This lane works only with public data. It never sees RTA's provided data. Its first task could change the whole project: finding out whether RTA's open daily tap files can still be downloaded, which would give the forecast many days to learn from instead of one.

## Step 1: give Devin access to the one repository

The repository `Kazemkhani/insiyab` is private and belongs to Amir. Mustafo has write access as `Mustafo-Z` (accept the invitation first: https://github.com/Kazemkhani/insiyab/invitations).

**Try first:** in Devin's settings, connect GitHub and choose the repository `Kazemkhani/insiyab`. If Devin can see it, go to step 2.

**If Devin cannot see it** (the repository belongs to another account), use a key that opens this one repository and nothing else:

1. In the Devin session, ask it to run this and show only the line it prints:
```
ssh-keygen -t ed25519 -N "" -f ~/.ssh/insiyab -C devin-lane-3 && cat ~/.ssh/insiyab.pub
```
2. Send that one line (it starts `ssh-ed25519`, and it is not a secret) to Amir.
3. Amir saves it as a file and runs:
```
gh repo deploy-key add ~/Desktop/devin-lane-3.pub --repo Kazemkhani/insiyab --allow-write --title devin-lane-3
```
4. Devin then clones with:
```
GIT_SSH_COMMAND="ssh -i ~/.ssh/insiyab -o IdentitiesOnly=yes" git clone git@github.com:Kazemkhani/insiyab.git
```
and sets, inside the clone, `git config core.sshCommand "ssh -i ~/.ssh/insiyab -o IdentitiesOnly=yes"`, `git config user.name "<Mustafo's name>"` and `git config user.email "<Mustafo's GitHub email>"`.

Never give Devin a password or a token that opens all of your repositories. Amir can remove the key at any time and nothing else is affected.

## Step 2: the message to paste into a new Devin session

```
You are lane 3 of four on the repository Kazemkhani/insiyab, branch main. Clone it, run bash scripts/install-hooks.sh, then read handoff/3-devin-opendata/PROMPT.md in the repository (the attached zip has the same file as it was when the zip was made; the repository is the current copy) and carry it out as my instructions, in the order of its section 8. Push to main inside your own folders only, pulling with rebase before each push. Tonight's target: items 1 to 4 of section 8 pushed by 06:00 Dubai time (02:00 UTC). Item 1, opendata/ACCESS.md, is wanted within the first hour: if the data needs an account, do not create one, write the exact steps for a person in coordination/lane-3.md and carry on with item 2.
```

## What it may need from a person

If RTA's open data needs an account or a key, it writes `TO AMIR:` in `coordination/lane-3.md` with the steps. Registering is for a person to do, in their own name.
