import re
from typing import Dict, List, Any

DESIGNATIONS = [
    "Professor & Head", "Professor", "Associate Professor", "Assistant Professor (Selection Grade)",
    "Assistant Professor", "Distinguished Professor", "Dean", "Director", "Chairperson",
    "Head of Department", "HOD", "Lecturer", "Senior Lecturer", "Research Scientist", "Faculty Member"
]

DISALLOWED_TITLES = [
    "chancellor", "vice-chancellor", "vice chancellor", "registrar", "governing body",
    "ombudsperson", "finance officer", "anti-ragging", "admissions enquiry"
]

class FacultyExtractor:
    @staticmethod
    def extract_faculty(page: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extracts verified institutional faculty directories, designations, departments,
        academic qualifications, and emails across tables, cards, and list elements.
        """
        text = page.get("cleaned_text", "")
        url = page.get("url", "")
        tables = page.get("tables", [])
        headings = [h for h_list in page.get("headings", {}).values() for h in h_list]
        lists = [item for sublist in page.get("lists", []) for item in sublist]
        paragraphs = page.get("paragraphs", [])

        faculty_list: List[Dict[str, Any]] = []
        seen_names = set()

        # 1. Parse faculty tables
        for tbl in tables:
            for row in tbl.get("rows", []):
                row_str = " ".join(row).strip()
                if len(row_str) < 4:
                    continue

                email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", row_str)
                email = email_match.group(0) if email_match else None

                desig = FacultyExtractor._find_designation(row_str)

                name_match = re.search(r"\b(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+([A-Za-z\.\s]{3,40})\b", row_str)
                if name_match:
                    full_name = f"{name_match.group(1)} {name_match.group(2).strip()}"
                    full_name = FacultyExtractor._clean_faculty_name(full_name)
                    if full_name and full_name.lower() not in seen_names:
                        seen_names.add(full_name.lower())
                        dept = FacultyExtractor._find_department(row_str)
                        qual = FacultyExtractor._find_qualifications(row_str, full_name)
                        faculty_list.append({
                            "name": full_name,
                            "designation": desig or "Faculty Member",
                            "qualifications": qual,
                            "specialization": dept,
                            "official_email": email,
                            "source_url": url,
                            "verification_status": "VERIFIED"
                        })

        # 2. Parse Line-by-Line Cards and Listings
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        for i, line in enumerate(lines):
            # Line starting with academic or courtesy title
            m = re.match(r"^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+([A-Za-z\.\s]{3,45})$", line)
            if m:
                full_name = FacultyExtractor._clean_faculty_name(line)
                if not full_name or full_name.lower() in seen_names:
                    continue
                if any(bad in full_name.lower() for bad in DISALLOWED_TITLES):
                    continue

                # Inspect surrounding lines (up to 3 ahead) for designation, dept, qual, email
                surrounding = " ".join(lines[max(0, i):min(len(lines), i + 4)])
                desig = FacultyExtractor._find_designation(surrounding)
                dept = FacultyExtractor._find_department(surrounding)
                qual = FacultyExtractor._find_qualifications(surrounding, full_name)

                email_m = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", surrounding)
                email = email_m.group(0) if email_m else None

                seen_names.add(full_name.lower())
                faculty_list.append({
                    "name": full_name,
                    "designation": desig or "Faculty Member",
                    "qualifications": qual,
                    "specialization": dept,
                    "official_email": email,
                    "source_url": url,
                    "verification_status": "VERIFIED"
                })

        # 3. Check Headings & Paragraph Items
        for item in headings + lists + paragraphs:
            if len(item) > 180:
                continue
            m = re.search(r"\b(Dr\.|Prof\.)\s+([A-Za-z\.\s]{3,40})\b", item)
            if m:
                cand_name = f"{m.group(1)} {m.group(2).strip()}"
                cand_name = FacultyExtractor._clean_faculty_name(cand_name)
                if cand_name and cand_name.lower() not in seen_names:
                    if not any(bad in cand_name.lower() for bad in DISALLOWED_TITLES):
                        seen_names.add(cand_name.lower())
                        desig = FacultyExtractor._find_designation(item)
                        dept = FacultyExtractor._find_department(item)
                        qual = FacultyExtractor._find_qualifications(item, cand_name)
                        email_m = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", item)
                        faculty_list.append({
                            "name": cand_name,
                            "designation": desig or "Professor",
                            "qualifications": qual,
                            "specialization": dept,
                            "official_email": email_m.group(0) if email_m else None,
                            "source_url": url,
                            "verification_status": "VERIFIED"
                        })

        return faculty_list

    @staticmethod
    def _find_designation(text: str) -> str:
        for d in DESIGNATIONS:
            if re.search(r"\b" + re.escape(d) + r"\b", text, re.I):
                return d
        return ""

    @staticmethod
    def _find_department(text: str) -> str:
        d_match = re.search(r"\b((?:Department\s+of|School\s+of)\s+[A-Za-z\s&/]+?)(?:\.|\n|<|,|;|\(|$)", text, re.I)
        if d_match:
            d = d_match.group(1).strip()
            if 4 < len(d) < 60:
                return d
        return ""

    @staticmethod
    def _find_qualifications(text: str, name: str) -> str:
        quals = []
        if re.search(r"\bph\.?d\b", text, re.I) or "dr." in name.lower():
            quals.append("Ph.D.")
        if re.search(r"\bm\.?tech\b", text, re.I):
            quals.append("M.Tech")
        if re.search(r"\bm\.?s\b", text, re.I):
            quals.append("M.S.")
        if re.search(r"\bmd\b", text, re.I):
            quals.append("MD")
        if re.search(r"\bmbbs\b", text, re.I):
            quals.append("MBBS")
        if re.search(r"\bmpt\b", text, re.I):
            quals.append("MPT")
        if re.search(r"\bmasters\b", text, re.I):
            quals.append("Masters")

        return ", ".join(quals) if quals else "Postgraduate / Doctorate"

    @staticmethod
    def _clean_faculty_name(raw_name: str) -> str:
        cleaned = re.sub(r"\s+", " ", raw_name).strip()
        cleaned = re.sub(r"[\.,]+$", "", cleaned).strip()
        # Cut off if designation leaked into name
        for d in DESIGNATIONS:
            if d.lower() in cleaned.lower() and not cleaned.lower().startswith(d.lower()):
                idx = cleaned.lower().find(d.lower())
                cleaned = cleaned[:idx].strip()
        if len(cleaned) < 5 or len(cleaned) > 50:
            return ""
        return cleaned
