"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Globe, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCw, 
  Terminal, 
  ExternalLink, 
  ArrowRight,
  Layers,
  FileCheck,
  FileText,
  Sparkles,
  Loader2,
  GraduationCap,
  BookOpen,
  Trophy,
  Laptop,
  Smartphone,
  Monitor,
  Code2,
  Microscope,
  Briefcase,
  Compass,
  Building2,
  PhoneCall,
  Search
} from "lucide-react";
import CollegeSearchAutocomplete from "@/components/CollegeSearchAutocomplete";
import { startCrawlJob, fetchCrawlStatus, resolveCollegeUrl, CrawlJobStatus, CollegeSuggestion } from "@/lib/api";

// Student-centric animated indicator icons that cycle along the loading bar
const SCANNER_THEME_ICONS = [
  { id: "books", label: "Library & Syllabi", icon: BookOpen, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "sports", label: "Sports & Campus Life", icon: Trophy, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "study", label: "Degrees & Programs", icon: GraduationCap, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "laptop", label: "Digital Learning & Labs", icon: Laptop, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { id: "mobile", label: "Campus Helpdesk & Contact", icon: Smartphone, color: "text-rose-600 bg-rose-50 border-rose-200" },
  { id: "computer", label: "Tech Workstations", icon: Monitor, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { id: "coding", label: "Coding & Innovation", icon: Code2, color: "text-violet-600 bg-violet-50 border-violet-200" },
  { id: "science", label: "Research & Science Labs", icon: Microscope, color: "text-teal-600 bg-teal-50 border-teal-200" },
  { id: "career", label: "Career & Placements", icon: Briefcase, color: "text-orange-600 bg-orange-50 border-orange-200" },
];

// Student-centric quotes, website rules & platform features rotating every 3 seconds
const ROTATING_INSIGHTS = [
  {
    badge: "Official Proof Policy",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ShieldCheck,
    title: "Every Output Has Its Direct Source Link As Proof",
    desc: "Zero rumors or guessing. Every syllabus download link, fee structure, and faculty detail extracted is backed by the exact official university link so you can verify it yourself with one click."
  },
  {
    badge: "Website Rule & Ethics",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Compass,
    title: "Find Your College Only Shows You The Path",
    desc: "We provide 100% unbiased transparency to guide students. All applications, admissions, and payments are submitted directly on the university's official portal."
  },
  {
    badge: "Words to Inspire",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Sparkles,
    title: "“Education is the most powerful weapon which you can use to change the world.”",
    desc: "— Nelson Mandela. Finding the right academic environment and mentors is the first step toward your dreams."
  },
  {
    badge: "Active Feature",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: BookOpen,
    title: "Direct Syllabus & Curriculum Downloads",
    desc: "Our system gathers official syllabus PDFs and course structures across engineering, science, medicine, and management so you know what you will learn before enrolling."
  },
  {
    badge: "Words to Inspire",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Sparkles,
    title: "“The beautiful thing about learning is that no one can take it away from you.”",
    desc: "— B.B. King. Cultivate your curiosity, practical skills, and continuous learning."
  },
  {
    badge: "Active Feature",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Briefcase,
    title: "Verified Placement Records & Recruiter Insights",
    desc: "Analyzing official Career Development Cell bulletins for genuine highest packages, average salaries, and recruiting partners."
  },
  {
    badge: "Words to Inspire",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Sparkles,
    title: "“The secret of getting ahead is getting started.”",
    desc: "— Mark Twain. Take the initiative to explore colleges and find the program tailored for you."
  },
  {
    badge: "Active Feature",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    icon: GraduationCap,
    title: "Faculty Directories & Department Heads",
    desc: "Discover who teaches on campus: mapping professors, PhD credentials, research specializations, and direct profile links."
  },
  {
    badge: "Words to Inspire",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Sparkles,
    title: "“An investment in knowledge pays the best interest.”",
    desc: "— Benjamin Franklin. Clear facts give you the confidence to make the best college choice."
  }
];

function ScannerContent() {
  const searchParams = useSearchParams();

  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [universityName, setUniversityName] = useState(searchParams.get("name") || "");
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(25);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<CrawlJobStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto URL fetching state
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [resolveSuccessNote, setResolveSuccessNote] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // Animated loading state: icon and rotating quotes/rules index
  const [currentIconIndex, setCurrentIconIndex] = useState(0);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGeminiApiKey(localStorage.getItem("FIND_YOUR_COLLEGE_GEMINI_KEY") || "");
    }
  }, []);

  // Cycle animated icon and student insight every 3 seconds during scanning
  useEffect(() => {
    const isJobActive = isScanning || (jobStatus && jobStatus.status === "RUNNING");
    if (!isJobActive) return;

    const interval = setInterval(() => {
      setCurrentInsightIndex((prev) => (prev + 1) % ROTATING_INSIGHTS.length);
      setCurrentIconIndex((prev) => (prev + 1) % SCANNER_THEME_ICONS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isScanning, jobStatus?.status]);

  // Update when URL query params change & auto-start scan if requested
  useEffect(() => {
    const qUrl = searchParams.get("url");
    const qName = searchParams.get("name");
    const qAuto = searchParams.get("auto");
    if (qUrl) setUrl(qUrl);
    if (qName) setUniversityName(qName);

    if (qAuto === "true" && qUrl && !isScanning && !activeJobId) {
      handleStartScan(undefined, qUrl, qName || undefined);
    }
  }, [searchParams]);

  // Real-time status polling
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeJobId && isScanning) {
      interval = setInterval(async () => {
        const data = await fetchCrawlStatus(activeJobId);
        if (data) {
          setJobStatus(data);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            setIsScanning(false);
          }
        }
      }, 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJobId, isScanning]);

  // Auto URL fetching by college name
  const handleAutoFetchUrl = async (nameToFetch?: string) => {
    const targetName = nameToFetch || universityName;
    if (!targetName.trim()) {
      setErrorMsg("Please type a college name first to auto-fetch its official website.");
      return;
    }

    setIsResolvingUrl(true);
    setErrorMsg(null);
    setResolveSuccessNote(null);

    try {
      const res = await resolveCollegeUrl(targetName, geminiApiKey || undefined);
      if (res.official_website) {
        setUrl(res.official_website);
        setResolveSuccessNote(
          `Official URL identified: ${res.domain} — ready to explore official college details.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not automatically resolve official website.");
    } finally {
      setIsResolvingUrl(false);
    }
  };

  const handleSelectCollegeSuggestion = (college: CollegeSuggestion) => {
    setUniversityName(college.name);
    if (college.official_website) {
      setUrl(college.official_website);
      setResolveSuccessNote(`Official URL selected: ${college.official_website}`);
    } else {
      handleAutoFetchUrl(college.name);
    }
  };

  const handleStartScan = async (e?: React.FormEvent, overrideUrl?: string, overrideName?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      setErrorMsg("Please provide a valid URL starting with http:// or https://");
      return;
    }

    try {
      setIsScanning(true);
      const res = await startCrawlJob(targetUrl, maxDepth, maxPages, (overrideName || universityName).trim() || undefined);
      setActiveJobId(res.job_id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start college scanner");
      setIsScanning(false);
    }
  };

  const calculateProgressPercent = () => {
    if (!jobStatus || jobStatus.max_pages === 0) return isScanning ? 12 : 0;
    if (jobStatus.status === "COMPLETED") return 100;
    const pct = Math.round(((jobStatus.pages_crawled || 0) / jobStatus.max_pages) * 100);
    return Math.max(15, Math.min(pct, 95));
  };

  const currentIcon = SCANNER_THEME_ICONS[currentIconIndex];
  const CurrentIconComp = currentIcon.icon;
  const currentInsight = ROTATING_INSIGHTS[currentInsightIndex];
  const CurrentInsightIcon = currentInsight.icon;
  const progressPercent = calculateProgressPercent();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Friendly Student Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>Official College Discovery & Verification</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Explore Any College or University
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
          Type any college name or paste its official website link. Our system reads official prospectuses, faculty directories, syllabus download links, and placement records directly from authentic university sources.
        </p>
      </div>

      {/* URL Entry Form */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleStartScan} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto-suggesting College Name Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  College / University Name
                </label>
                <button
                  type="button"
                  onClick={() => handleAutoFetchUrl()}
                  disabled={isResolvingUrl || !universityName.trim()}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 disabled:opacity-40 transition"
                >
                  {isResolvingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  <span>Auto-Find Website</span>
                </button>
              </div>

              <CollegeSearchAutocomplete
                value={universityName}
                onChange={setUniversityName}
                onSelect={handleSelectCollegeSuggestion}
                autoNavigate={false}
                placeholder="Type college name (e.g. NIT Warangal, IIT Bombay, MNR University)..."
                inputClassName="py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Official Website URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Official College Website URL
              </label>
              <div className="relative">
                <Globe className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  required
                  placeholder="https://www.nitw.ac.in"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setResolveSuccessNote(null);
                  }}
                  disabled={isScanning}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Resolve Success Note */}
          {resolveSuccessNote && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{resolveSuccessNote}</span>
            </div>
          )}

          {/* Friendly Exploration Scope Controls */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">Scan Depth:</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Level {maxDepth}</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                disabled={isScanning}
                className="w-full accent-blue-600"
              />
              <span className="text-[11px] text-slate-400 block">Explores homepage and {maxDepth === 1 ? "direct links" : maxDepth === 2 ? "department subpages" : "deep catalogs"}</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">Pages to Explore:</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{maxPages} pages</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value))}
                disabled={isScanning}
                className="w-full accent-blue-600"
              />
              <span className="text-[11px] text-slate-400 block">Brochures, courses, faculty directories & placements</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>100% Safe • Official University Portals Only • Direct Source Links</span>
            </div>

            <button
              type="submit"
              disabled={isScanning || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {isScanning ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>Scanning College Website...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Explore College Details</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Status Card & Animated Student Experience */}
      {(jobStatus || isScanning) && (
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Exploration</span>
                {jobStatus?.job_id && (
                  <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">Active</span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
                {universityName || jobStatus?.university_name || url}
              </h3>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              jobStatus?.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
              jobStatus?.status === "FAILED" ? "bg-rose-100 text-rose-800" :
              "bg-blue-100 text-blue-800 animate-pulse"
            }`}>
              {jobStatus?.status === "COMPLETED" ? "Scan Completed" :
               jobStatus?.status === "FAILED" ? "Scan Incomplete" : "Exploring Campus..."}
            </span>
          </div>

          {/* BEAUTIFUL ANIMATED LOADING BAR WITH CHANGING POINTER ICONS */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Gathering Authentic College Facts...</span>
              </span>
              <span className="text-sm font-extrabold text-blue-600">{progressPercent}%</span>
            </div>

            {/* The Animated Bar Track with Dynamic Floating Indicator */}
            <div className="relative pt-10 pb-2">
              {/* Animated Floating Pointer that smoothly slides and cycles icons */}
              <div 
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-700 ease-out"
                style={{ left: `${Math.max(6, Math.min(progressPercent, 94))}%` }}
              >
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-md font-bold text-xs ${currentIcon.color} animate-bounce transition-all duration-500`}>
                  <CurrentIconComp className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[11px] whitespace-nowrap">{currentIcon.label}</span>
                </div>
                {/* Arrow pointer indicator */}
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-blue-600 mt-0.5"></div>
              </div>

              {/* Glowing Progress Bar Track */}
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner relative">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                >
                  {/* Subtle moving shimmer highlight */}
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            {/* ROTATING 3-SECOND INSPIRING STUDENT QUOTES, RULES & FEATURES CAROUSEL */}
            <div className="pt-2">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border border-slate-200/90 shadow-sm transition-all duration-500 min-h-[105px] flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentInsight.badgeColor}`}>
                    <CurrentInsightIcon className="h-3 w-3" />
                    <span>{currentInsight.badge}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Auto-refreshes every 3s</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {currentInsight.title}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {currentInsight.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Friendly Milestone Highlights (Student View) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                ✓
              </div>
              <span className="font-medium text-slate-700">Official Portal Check</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                ✓
              </div>
              <span className="font-medium text-slate-700">Courses & Syllabi</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                ✓
              </div>
              <span className="font-medium text-slate-700">Faculty & Chairs</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                ✓
              </div>
              <span className="font-medium text-slate-700">Placements & Offices</span>
            </div>
          </div>

          {/* Student-Friendly Statistics Counters */}
          {jobStatus && (
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-2xl font-extrabold text-slate-900">{jobStatus.pages_discovered}</div>
                <div className="text-xs font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                  <span>Campus Pages Found</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-2xl font-extrabold text-slate-900">{jobStatus.pages_crawled}</div>
                <div className="text-xs font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Brochures & Pages Read</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-2xl font-extrabold text-slate-900">{jobStatus.records_extracted}</div>
                <div className="text-xs font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Verified College Details</span>
                </div>
              </div>
            </div>
          )}

          {/* OPTIONAL TECHNICAL DEBUG ACCORDION (COLLAPSED BY DEFAULT FOR DEVELOPERS ONLY) */}
          {jobStatus?.logs && jobStatus.logs.length > 0 && (
            <details className="pt-2 group border-t border-slate-100">
              <summary className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer inline-flex items-center gap-1.5 py-1 transition select-none">
                <Terminal className="h-3.5 w-3.5" />
                <span>Developer diagnostic logs (Technical view)</span>
              </summary>
              <div className="mt-2 bg-slate-950 rounded-2xl p-4 font-mono text-xs text-slate-300 max-h-44 overflow-y-auto space-y-1 shadow-inner">
                {jobStatus.logs.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 select-none">[{log.level}]</span>
                    <span className={
                      log.level === "ERROR" ? "text-rose-400" :
                      log.level === "WARNING" ? "text-amber-400" : "text-slate-300"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Action & Extracted Data Display When Completed */}
          {jobStatus?.status === "COMPLETED" && (
            <div className="space-y-6 pt-2 animate-in fade-in duration-300">
              {/* Success Banner with Direct University Profile Button */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm mt-0.5">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      {jobStatus.university_name || "Exploration Completed!"}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Successfully explored {jobStatus.pages_crawled} official pages and gathered {jobStatus.records_extracted} verified college details with source proof.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {jobStatus.university_id ? (
                    <Link
                      href={`/colleges/${jobStatus.university_id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition active:scale-95"
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>View Full College Profile</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/search"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
                    >
                      <span>Find in Directory</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  {jobStatus.university_id && (
                    <Link
                      href={`/compare?id=${jobStatus.university_id}`}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                    >
                      Compare
                    </Link>
                  )}
                </div>
              </div>

              {/* Extracted Structured Intelligence Summary */}
              {jobStatus.extracted_summary && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      <span>Verified Details Summary</span>
                    </h4>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Information Completeness: {jobStatus.extracted_summary.data_completeness_score}%
                    </span>
                  </div>

                  {/* Summary Category Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-lg font-bold text-slate-900">
                        {jobStatus.extracted_summary.programs_count}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Courses & Degrees
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-lg font-bold text-slate-900">
                        {jobStatus.extracted_summary.departments_count ?? 0}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Departments
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-lg font-bold text-slate-900">
                        {jobStatus.extracted_summary.admissions_count}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Admissions
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-lg font-bold text-slate-900">
                        {jobStatus.extracted_summary.placements_count}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Placements
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-lg font-bold text-slate-900">
                        {jobStatus.extracted_summary.scholarships_count}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Scholarships
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-lg font-bold text-slate-900">
                        {jobStatus.extracted_summary.faculty_count}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Faculty
                      </div>
                    </div>
                  </div>

                  {/* Extracted Facts with Source Traceability Table */}
                  {jobStatus.extracted_summary.recent_records && jobStatus.extracted_summary.recent_records.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Extracted Facts with Direct Proof Links</span>
                        <span className="text-[11px] font-normal text-slate-500">Every Fact Verified</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto bg-white text-xs">
                        {jobStatus.extracted_summary.recent_records.map((rec, i) => (
                          <div key={i} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                  {rec.category}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {rec.field_name.replace(/_/g, " ")}:
                                </span>
                                <span className="text-slate-900 font-medium truncate">
                                  {rec.extracted_value}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>Official Source Proof:</span>
                                <a
                                  href={rec.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate max-w-xs inline-flex items-center gap-0.5"
                                >
                                  <span>{rec.source_url}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </div>
                            </div>

                            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {rec.verification_status} ({Math.round(rec.confidence_score * 100)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Profile CTA */}
                  {jobStatus.university_id && (
                    <div className="pt-2 text-center">
                      <Link
                        href={`/colleges/${jobStatus.university_id}`}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span>Open Full College Profile for {jobStatus.university_name || "this College"}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WebsiteScannerPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading website scanner...</div>}>
      <ScannerContent />
    </Suspense>
  );
}
