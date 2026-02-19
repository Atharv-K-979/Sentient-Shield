# Sentient-Shield 🎓(Prototype)
**Empowering Students through Seamless Digital Integration**

---

## 📌 Overview
The **Sentient-Shield** is a specialized browser extension tailored for students and faculty of the All India Shri Shivaji Memorial Society (AISSMS). It serves as a digital companion that sits right in your browser, streamlining access to academic resources, attendance tracking, and institutional updates.

## Project Screenshots

### Screenshot 1
![Screenshot 1](images/image.png)

### Screenshot 2
![Screenshot 2](images/image%20%281%29.png)

### Screenshot 3
![Screenshot 3](images/image%20%282%29.png)


---

## ⚠️ The Problem Statement
Despite having a robust infrastructure, students often encounter several digital friction points:
* **Complex Navigation:** Navigating through multiple sub-domains for the ERP, Library, and Moodle can be time-consuming.
* **Manual Monitoring:** Students have to manually log in daily to check for attendance updates or internal marks.
* **Information Overload:** Critical notices are often mixed with general circulars, making it easy to miss urgent deadlines.
* **Legacy UI:** Some internal portals are not mobile-optimized or user-friendly for quick data retrieval.

---

## ✅ The Solution
Sentient-Shield provides a **centralized interface** that simplifies the college experience:
* **One-Click Portals:** Instant access to the ERP, Fee portal, and Exam section without searching for links.
* **Live Attendance Tracker:** A persistent progress bar showing your attendance percentage compared to the 75% requirement.
* **Smart Scraping:** Automatically extracts and displays your schedule and internal grades directly in the extension popup.
* **Instant Notifications:** Desktop alerts for new circulars, results, or sudden timetable changes.

---

## 🛠️ Tech Stack

### Extension Architecture
* **Manifest V3:** Utilizing the latest extension standards for enhanced security, privacy, and background service workers.

### Frontend (UI/UX)
* **React.js:** Powers the dynamic and interactive popup interface.
* **Tailwind CSS:** Ensures a responsive, modern, and high-performance styling layer.
* **Shadcn UI:** Provides accessible and beautiful UI components.

### Backend & Connectivity
* **Chrome Storage API:** Securely stores user tokens and local preferences locally on the device.
* **Cheerio/DOM Parser:** In-browser scraping to pull data from legacy ERP HTML tables into a clean JSON format.
* **Firebase (Optional):** Used for real-time database synchronization and push notification triggers.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **Attendance Monitor** | Visualizes current attendance and calculates how many lectures can be missed or need to be attended to maintain criteria. |
| **Auto-Login Sync** | Safely stores credentials to provide a "Single Sign-On" feel across all AISSMS web platforms. |
| **Resource Vault** | Direct access to Syllabus PDFs, Previous Year Question Papers (PYQs), and Faculty contact directories. |
| **Exam Countdown** | A live timer for upcoming internal (Unit Tests) and External (SPPU) examinations. |

---

## 📂 Installation for Developers

1. **Clone the repository:**
   ```bash
   https://github.com/Atharv-K-979/Sentient-Shield/
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Build the production folder:**
   ```bash
   npm run build
   ```
4. **Load into Browser:**
   ``` bash
   Go to chrome://extensions/
   Turn on Developer Mode.
   ```
Click Load Unpacked and select the dist or build folder from this project.

## 🛠️ Contributing
* This project is built by the students, for the students.
* Fork the Project.
* Create your Feature Branch (git checkout -b feature/AmazingFeature).
* Commit your Changes (git commit -m 'Add some AmazingFeature').
* Push to the Branch (git push origin feature/AmazingFeature).
* Open a Pull Request.
