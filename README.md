# 🛡️ Sentient Shield

##  Overview

Sentient Shield is a lightweight Chrome extension designed to prevent accidental exposure of sensitive information during everyday browsing and AI tool usage.

---

##  Problem

Users often unknowingly paste sensitive data such as:

- Passwords  
- API keys  
- Tokens  
- Personal information  

into websites, chat applications, or AI tools like ChatGPT.

This leads to unintended data leaks and potential security risks.

---

##  Solution

Sentient Shield intercepts clipboard paste events and protects users by masking sensitive data before it is inserted into input fields.

---

##  How It Works

- Listens for global paste events in the browser  
- Extracts clipboard content  
- Uses pattern-based detection (regex) to identify sensitive data  
- Replaces detected content with masked text (e.g., `XXXX`)  
- Allows safe interaction without exposing real values  

---

##  Features

-  Clipboard Protection  
-  Real-time Paste Interception  
-  Pattern-based Detection (Passwords, Keys, Tokens)  
-  Automatic Redaction  

---

## Tech Stack

- Chrome Extension (Manifest V3)  
- Vanilla JavaScript  
- DOM Event Handling  

---

##  Usage

1. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click **Load Unpacked**
   - Select the project folder

2. Try pasting sensitive-looking text into any input field

3. The extension will automatically mask the content

---

##  Limitations

- Regex-based detection may cause false positives  
- Cannot fully understand context of data  
- Designed as a basic protection layer  

---

##  Future Improvements

- Replace regex with ML-based detection  
- Context-aware filtering  
- Better accuracy and reduced false positives  

---

##  Conclusion

Sentient Shield is a simple yet effective first step toward preventing accidental data leaks at the user interaction level.
