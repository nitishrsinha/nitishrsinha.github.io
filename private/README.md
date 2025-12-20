# Protected Research Materials

This directory contains password-protected research materials and working papers for Nitish Ranjan Sinha's academic website. The content is encrypted using [StatiCrypt](https://github.com/robinmoisson/staticrypt) for secure hosting on GitHub Pages.

## 📁 Directory Structure

```
/private/
├── README.md                  # This file - documentation and instructions
├── encrypt.sh                 # Script to encrypt HTML files
├── index.html                 # Directory listing (encrypted after running script)
├── example-research.html      # Template for research notes (encrypted after running script)
└── .backups/                  # Backup directory (created automatically, git-ignored)
```

## 🔐 What is StatiCrypt?

StatiCrypt is a tool that generates password-protected static HTML pages using **AES-256 encryption**. It's perfect for GitHub Pages because:

- **Client-side encryption**: All decryption happens in the browser - no server required
- **Static hosting compatible**: Works perfectly with GitHub Pages' static hosting
- **Session persistence**: Enter password once, access all protected pages
- **No backend needed**: Pure JavaScript - no databases or authentication servers
- **Strong encryption**: Uses AES-256, the same encryption standard used by governments and banks

### How It Works

1. StatiCrypt takes your HTML file and encrypts it with your password
2. It creates a new HTML file that contains the encrypted content + decryption JavaScript
3. When someone visits the page, they enter the password
4. The JavaScript decrypts the content in their browser and displays it
5. With the `-r` flag, the password is remembered for the session across all pages

## 🚀 Getting Started

### Prerequisites

You need Node.js and npm installed on your system. Then install StatiCrypt globally:

```bash
npm install -g staticrypt
```

To verify installation:

```bash
staticrypt --version
```

### Quick Start Guide

1. **Create your research content** (or use the template):
   ```bash
   # Copy the example template to create a new document
   cp example-research.html my-research-notes.html
   # Edit it with your content
   ```

2. **Encrypt all HTML files**:
   ```bash
   cd private
   ./encrypt.sh
   ```

   The script will:
   - Check if StatiCrypt is installed
   - Prompt you for a password (twice for confirmation)
   - Create backups of all original files
   - Encrypt all `.html` files in the directory
   - Enable session persistence (password remembered across pages)

3. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Add encrypted research materials"
   git push
   ```

4. **Access your protected content**:
   - Visit: `https://nitishrsinha.github.io/private/`
   - Enter the password when prompted
   - Access all protected documents during your session

## 📝 Adding New Content

### Method 1: Using the Template

1. Copy the example template:
   ```bash
   cp example-research.html my-new-paper.html
   ```

2. Edit `my-new-paper.html` with your content

3. Add an entry to `index.html` (before encrypting):
   ```html
   <div class="document-item">
       <h3><span class="lock-icon">🔒</span> Your Paper Title</h3>
       <div class="meta">Last updated: [Date] | Status: [Draft/Working Paper/etc.]</div>
       <div class="description">
           Brief description of your paper or research notes.
       </div>
       <a href="my-new-paper.html" class="access-link">Access Document</a>
   </div>
   ```

4. Run the encryption script:
   ```bash
   ./encrypt.sh
   ```

5. Commit and push your changes

### Method 2: Manual Encryption

If you prefer to encrypt files manually:

```bash
# Encrypt a single file with session persistence
staticrypt my-file.html YOUR_PASSWORD -r

# Encrypt multiple files with the same password and session persistence
staticrypt file1.html file2.html file3.html YOUR_PASSWORD -r
```

**Important**: Always use the `-r` flag to enable session persistence, so users only need to enter the password once.

## 🔄 Updating Content

To update already encrypted content:

1. **Restore from backup** (if needed):
   ```bash
   # Find your backup in .backups/ directory
   cp .backups/my-file.html.original.20251220_143000.html my-file.html
   ```

2. **Or keep the unencrypted versions** in a separate local directory:
   ```bash
   # Example workflow
   ~/research-originals/
   ├── paper1.html
   └── paper2.html

   # Make edits in ~/research-originals/
   # Copy to your repo
   # Then run encrypt.sh
   ```

3. **Make your edits** to the unencrypted version

4. **Re-encrypt**:
   ```bash
   ./encrypt.sh
   ```

5. **Commit and push**

## 🔑 Password Management

### Choosing a Strong Password

- Use a password with at least 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Avoid dictionary words or personal information
- Consider using a passphrase (e.g., "Correct-Horse-Battery-Staple-2025")

### Changing the Password

To change the password for all files:

1. Restore all files from backups or your local unencrypted copies
2. Run `./encrypt.sh` with the new password
3. Commit and push
4. Notify authorized users of the password change

### Password Recovery

**CRITICAL**: There is **NO** password recovery mechanism. If you forget the password:

- The encrypted content cannot be recovered
- You MUST keep backups of your original unencrypted files
- Consider storing the password in a secure password manager
- Keep a copy of unencrypted files in a secure local location

## 🔒 Security Considerations

### What StatiCrypt Protects

✅ **Content confidentiality**: Files are encrypted with AES-256
✅ **Unauthorized access**: Only users with the password can view content
✅ **Client-side security**: No server-side vulnerabilities

### What StatiCrypt Does NOT Protect

❌ **Password guessing**: If someone guesses/knows your password, they can access content
❌ **Brute force attacks**: A weak password can be cracked
❌ **File existence**: People can see that encrypted files exist (but not their content)
❌ **Metadata**: File names, sizes, and modification dates are visible
❌ **Man-in-the-middle attacks**: Use HTTPS (GitHub Pages provides this automatically)

### Best Practices

1. **Use strong, unique passwords** for this content
2. **Keep unencrypted backups** in a secure location (NOT in the git repo)
3. **Use .gitignore** to prevent committing unencrypted files:
   ```bash
   # Add to /private/.gitignore
   *.original.html
   .backups/
   ```
4. **Share passwords securely**: Don't send passwords via email; use secure channels
5. **Regular updates**: Change passwords periodically, especially if shared widely
6. **Monitor access**: GitHub Pages doesn't provide access logs, so be aware of who has the password

### Compliance Notes

- StatiCrypt uses AES-256 encryption, which is FIPS 140-2 compliant
- Suitable for sensitive but non-classified research materials
- For highly confidential or classified information, consider alternative solutions
- Check with your organization's IT security policies before deploying

## 🛠 Troubleshooting

### "StatiCrypt is not installed" error

```bash
npm install -g staticrypt
```

If you don't have npm:
1. Install Node.js from https://nodejs.org/
2. Node.js includes npm automatically

### Files not encrypting properly

- Make sure files have `.html` extension
- Check that you're in the `/private` directory when running the script
- Verify file permissions: `chmod 644 *.html`

### Forgot to backup before encrypting

- Check the `.backups/` directory - the script creates automatic backups
- If using git, you can recover old versions: `git checkout HEAD~1 -- filename.html`

### Password not working

- Passwords are case-sensitive
- Make sure there are no extra spaces
- If you encrypted files with different passwords, you'll need to enter each one
- Use the same password for all files to enable session persistence

### Changes not showing on GitHub Pages

- GitHub Pages can take 1-2 minutes to update after a push
- Check GitHub Actions to see if the deployment succeeded
- Try a hard refresh in your browser (Ctrl+Shift+R or Cmd+Shift+R)

## 📚 Additional Resources

- [StatiCrypt Documentation](https://github.com/robinmoisson/staticrypt)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [AES-256 Encryption Overview](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)

## 🔍 Template Structure

The `example-research.html` template includes:

- **Abstract**: 150-250 word summary
- **Research Question**: Clear articulation of the problem
- **Key Findings**: Major discoveries with evidence
- **Methodology**: Research approach and techniques
- **Data Sources**: Detailed source documentation
- **Key References**: Relevant literature
- **Preliminary Conclusions**: Implications for policy/research
- **Next Steps**: Action items and timeline
- **Working Notes**: Informal ideas and reminders

Customize this structure based on your needs!

## 📞 Support

For issues or questions about:

- **StatiCrypt**: Visit [StatiCrypt GitHub Issues](https://github.com/robinmoisson/staticrypt/issues)
- **This setup**: Contact the repository owner
- **GitHub Pages**: See [GitHub Pages documentation](https://docs.github.com/en/pages)

---

**Last Updated**: December 2025
**Maintained by**: Nitish Ranjan Sinha
**License**: Content is protected; scripts are provided as-is for personal use
