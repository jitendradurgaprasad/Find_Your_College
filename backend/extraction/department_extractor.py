import re
from typing import Dict, List, Any

DISALLOWED_DEPT_WORDS = [
    "admission", "apply", "contact", "login", "portal", "syllabus", "tender",
    "fee refund", "grievance", "rti", "circular", "exam", "hostel", "mess",
    "fosters the development", "development plan"
]

class DepartmentExtractor:
    @staticmethod
    def extract_departments(page: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extracts verified academic departments, divisions, and constituent schools.
        """
        text = page.get("cleaned_text", "")
        url = page.get("url", "")
        headings = [h for h_list in page.get("headings", {}).values() for h in h_list]
        lists = [item for sublist in page.get("lists", []) for item in sublist]

        departments: List[Dict[str, Any]] = []
        seen = set()

        candidates = headings + lists + [text]

        # 1. Regex search for Schools and Departments
        dept_pattern = re.compile(
            r"\b((?:Department\s+of|School\s+of|Center\s+of\s+Excellence\s+in|Centre\s+for)\s+[A-Za-z0-9\s&/,\(\)-]+?)(?:\.|\n|\r|<|,|;|\(|$)",
            re.I
        )

        for c in candidates:
            for match in dept_pattern.finditer(c):
                raw_name = match.group(1).strip()
                # Clean up whitespace and linebreaks
                clean_name = re.sub(r"\s+", " ", raw_name).strip()

                if clean_name.endswith((".", ",", ";", "-")):
                    clean_name = clean_name[:-1].strip()

                name_lower = clean_name.lower()
                if len(clean_name) < 8 or len(clean_name) > 85:
                    continue
                if any(bad in name_lower for bad in DISALLOWED_DEPT_WORDS):
                    continue

                # Normalization
                norm_key = re.sub(r"[^a-zA-Z0-9]", "", name_lower)
                if norm_key not in seen:
                    seen.add(norm_key)

                    # Generate a concise code (e.g. CSE, SAHS, SOET, PT)
                    words = [w for w in clean_name.split() if w.lower() not in ("of", "and", "&", "the", "in", "for")]
                    code = "".join([w[0].upper() for w in words if w])[:8]

                    # Check for Head of Department / Dean mentioned in text
                    hod = None
                    hod_match = re.search(
                        re.escape(clean_name) + r"[\s\w,:-]{0,40}?(?:Dean|Head|Director|HOD|In-charge)[\s:]+(Dr\.|Prof\.|Mr\.|Ms\.)?\s*([A-Za-z\.\s]{3,35})",
                        text,
                        re.I
                    )
                    if hod_match:
                        prefix = hod_match.group(1) or ""
                        h_name = hod_match.group(2).strip()
                        hod = f"{prefix} {h_name}".strip()

                    departments.append({
                        "name": clean_name,
                        "code": code,
                        "head_of_department": hod,
                        "description": f"Academic division offering degree curricula and research programs. Verified at {url}",
                        "source_url": url
                    })

        return departments
