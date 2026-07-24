import { useEffect, useState, useRef } from 'react';
import { Upload, FileText, X, Phone, Mail, GraduationCap, Briefcase, Search, Trash2, Filter, ChevronDown, CloudUpload, AlertCircle, CheckCircle, Zap, Send, LayoutList, TerminalSquare, Users, User, Globe, MapPin, ClipboardCheck, ShieldCheck, Pencil, Save, Download, Flame, Bookmark, PhoneCall, StickyNote, Calendar, MessageSquare, ArrowRightLeft, UserCog, Activity as ActivityIcon, FolderOpen, GitMerge, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadCsvExport } from '../lib/export';
import { isMine } from '../lib/ownership';

/* Slate → blue monochrome avatars (brand-aligned) */
const AVATAR_COLORS = [
  ['#64748b', '#f1f5f9'], ['#3b82f6', '#eff6ff'], ['#2563eb', '#dbeafe'],
  ['#1d4ed8', '#dbeafe'], ['#1e3a8a', '#e0e7ff'], ['#475569', '#f8fafc'],
];
function getInitials(name) { return name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??'; }
function getAvatarColors(name) {
  let h=0; for(let i=0;i<(name?.length||0);i++) h=(h*31+name.charCodeAt(i))%AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}

const EXP_FILTERS = ['All', 'Entry', 'Mid', 'Senior'];
const WORK_AUTH_TYPES = ['All', 'US Citizen', 'Green Card', 'H1B', 'W2', 'C2C'];

const ACTIVITY_TYPES = [
  { id: 'Note', label: 'Note', icon: StickyNote },
  { id: 'Call', label: 'Call', icon: PhoneCall },
  { id: 'Email', label: 'Email log', icon: Mail },
  { id: 'Meeting', label: 'Meeting', icon: Calendar },
];

const ACTIVITY_FILTERS = ['All', 'Note', 'Call', 'Email', 'Meeting', 'Stage', 'Ownership', 'System'];

function activityMeta(type) {
  const t = (type || 'Note').toLowerCase();
  if (t === 'call') return { color: 'var(--primary)', bg: 'var(--primary-glow)', Icon: PhoneCall, label: 'Call' };
  if (t === 'email') return { color: 'var(--primary-dark)', bg: 'var(--primary-glow)', Icon: Mail, label: 'Email' };
  if (t === 'meeting') return { color: 'var(--primary-light)', bg: 'var(--stage-2-soft)', Icon: Calendar, label: 'Meeting' };
  if (t === 'stage') return { color: 'var(--primary)', bg: 'var(--stage-3-soft)', Icon: ArrowRightLeft, label: 'Stage' };
  if (t === 'ownership') return { color: 'var(--text-2)', bg: 'var(--surface-3)', Icon: UserCog, label: 'Ownership' };
  if (t === 'system') return { color: 'var(--text-3)', bg: 'var(--surface-2)', Icon: ActivityIcon, label: 'System' };
  return { color: 'var(--text-2)', bg: 'var(--surface-2)', Icon: StickyNote, label: 'Note' };
}

function timeAgoShort(iso) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CandidatesView() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState('All'); // All | Name | Email | Skill | Location
  const [expFilter, setExpFilter] = useState('All');
  const [authFilter, setAuthFilter] = useState('All');
  const [deskMode, setDeskMode] = useState('all'); // all | mine
  const [team, setTeam] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [activityType, setActivityType] = useState('Note');
  const [activityFilter, setActivityFilter] = useState('All');
  const [postingActivity, setPostingActivity] = useState(false);
  const [candidateApps, setCandidateApps] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('Resume');
  const [docUploading, setDocUploading] = useState(false);
  const [dupMatches, setDupMatches] = useState([]);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState(null);
  const [merging, setMerging] = useState(false);
  const docInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Tab control in Profile Snapshot
  const [snapshotTab, setSnapshotTab] = useState('profile'); // profile | pipeline | notes

  // Copilot State
  const [jobs, setJobs] = useState([]);
  const [copilotSummary, setCopilotSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [draftJobId, setDraftJobId] = useState('');
  const [copilotDraft, setCopilotDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Bulk Actions States
  const [activeIds, setActiveIds] = useState(new Set());
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailBody, setBulkEmailBody] = useState('');
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailSmtpMode, setEmailSmtpMode] = useState(null);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [bulkJobId, setBulkJobId] = useState('');
  const [hotlists, setHotlists] = useState([]);
  const [showAddHotlist, setShowAddHotlist] = useState(false);
  const [hotlistPickId, setHotlistPickId] = useState('');
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchPick, setSavedSearchPick] = useState('');
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showQuickParse, setShowQuickParse] = useState(false);
  const [quickParseText, setQuickParseText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCandidates = () =>
    fetch('/api/ats/candidates').then(r=>r.json()).then(setCandidates).catch(console.error);

  const loadHotlists = () =>
    fetch('/api/ats/hotlists').then(r => r.ok ? r.json() : []).then(d => setHotlists(Array.isArray(d) ? d : [])).catch(() => {});
  const loadSavedSearches = () =>
    fetch('/api/ats/saved-searches').then(r => r.ok ? r.json() : []).then(d => setSavedSearches(Array.isArray(d) ? d : [])).catch(() => {});

  useEffect(() => { 
    fetchCandidates(); 
    fetch('/api/ats/jobs').then(r=>r.json()).then(setJobs).catch(console.error);
    fetch('/api/auth/team').then(r => r.ok ? r.json() : []).then(d => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
    loadHotlists();
    loadSavedSearches();
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
      showToast('Please upload a PDF or Word document.');
      return;
    }
    setIsUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch('/api/ats/resume/parse', { 
        method: 'POST', 
        body: fd 
      });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.isDuplicate) {
          showToast(`Duplicate found — updated ${data.candidate?.name || 'existing candidate'}.`, 'success');
        } else {
          const conf = data.confidence != null ? ` · ${data.confidence}% confidence` : '';
          showToast(`ATS Pro Intelligence: ${data.candidate?.name || 'candidate'} added${conf}`, 'success');
        }
        fetchCandidates();
      } else {
        showToast('Upload failed: ' + await r.text());
      }
    } catch(e) { console.error(e); }
    setIsUploading(false);
  };

  const onFileChange = (e) => handleUpload(e.target.files[0]);
  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const handleDelete = async (id) => {
    await fetch(`/api/ats/candidates/${id}`, { method: 'DELETE' });
    if (selectedCandidate?.id === id) setSelectedCandidate(null);
    setCandidateToDelete(null);
    fetchCandidates();
    showToast('Candidate deleted successfully.', 'success');
  };

  const startEdit = () => {
    if (!selectedCandidate) return;
    let skills = '';
    try {
      const arr = JSON.parse(selectedCandidate.skillsJson || '[]');
      skills = Array.isArray(arr) ? arr.join(', ') : '';
    } catch { skills = ''; }
    setEditForm({
      name: selectedCandidate.name || '',
      role: selectedCandidate.role || '',
      email: selectedCandidate.email || '',
      phone: selectedCandidate.phone || '',
      experience: selectedCandidate.experience || '',
      education: selectedCandidate.education || '',
      city: selectedCandidate.city || '',
      state: selectedCandidate.state || '',
      workAuthorization: selectedCandidate.workAuthorization || 'US Citizen',
      ownership: selectedCandidate.ownership || '',
      status: selectedCandidate.status || 'Active',
      skills,
    });
    setEditing(true);
    setSnapshotTab('profile');
  };

  const saveEdit = async () => {
    if (!selectedCandidate || !editForm) return;
    setSavingEdit(true);
    const skillsArr = editForm.skills.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      ...selectedCandidate,
      name: editForm.name,
      role: editForm.role,
      email: editForm.email,
      phone: editForm.phone,
      experience: editForm.experience,
      education: editForm.education,
      city: editForm.city,
      state: editForm.state,
      workAuthorization: editForm.workAuthorization,
      ownership: editForm.ownership,
      status: editForm.status,
      skillsJson: JSON.stringify(skillsArr),
    };
    try {
      const r = await fetch(`/api/ats/candidates/${selectedCandidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setSelectedCandidate(payload);
        setEditing(false);
        fetchCandidates();
        showToast('Candidate updated.', 'success');
      } else {
        showToast('Failed to save candidate.', 'error');
      }
    } catch {
      showToast('Failed to save candidate.', 'error');
    }
    setSavingEdit(false);
  };

  const fetchActivities = async (id) => {
    try {
      const res = await fetch(`/api/ats/candidates/${id}/activities`);
      if (res.ok) setActivities(await res.json());
    } catch(e) { console.error(e); }
  };

  const fetchCandidateApps = async (id) => {
    try {
      const res = await fetch(`/api/ats/candidates/${id}/applications`);
      if (res.ok) setCandidateApps(await res.json());
      else setCandidateApps([]);
    } catch { setCandidateApps([]); }
  };

  const fetchDocuments = async (id) => {
    try {
      const res = await fetch(`/api/ats/candidates/${id}/documents`);
      if (res.ok) setDocuments(await res.json());
      else setDocuments([]);
    } catch { setDocuments([]); }
  };

  const fetchDuplicates = async (id) => {
    try {
      const res = await fetch(`/api/ats/candidates/${id}/duplicates`);
      if (res.ok) {
        const d = await res.json();
        setDupMatches(Array.isArray(d.matches) ? d.matches : []);
      } else setDupMatches([]);
    } catch { setDupMatches([]); }
  };

  const handleSelectCandidate = (c) => {
    setSelectedCandidate(c);
    setSnapshotTab('profile');
    setActivities([]);
    setCandidateApps([]);
    setDocuments([]);
    setDupMatches([]);
    setShowMerge(false);
    setMergeSourceId(null);
    setNewNote('');
    setActivityType('Note');
    setActivityFilter('All');
    setCopilotSummary('');
    setCopilotDraft('');
    setDraftJobId('');
    setEditing(false);
    setEditForm(null);
    if (c) {
      fetchActivities(c.id);
      fetchCandidateApps(c.id);
      fetchDocuments(c.id);
      fetchDuplicates(c.id);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCandidate) return;
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', docType);
      const res = await fetch(`/api/ats/candidates/${selectedCandidate.id}/documents`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        showToast('Document uploaded.', 'success');
        fetchDocuments(selectedCandidate.id);
        fetchActivities(selectedCandidate.id);
        fetchCandidates();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Upload failed.', 'error');
      }
    } catch {
      showToast('Upload failed.', 'error');
    } finally {
      setDocUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!selectedCandidate || !confirm('Remove this document?')) return;
    const res = await fetch(`/api/ats/candidates/${selectedCandidate.id}/documents/${docId}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      showToast('Document removed.', 'success');
      fetchDocuments(selectedCandidate.id);
    }
  };

  const handleMerge = async () => {
    if (!selectedCandidate || !mergeSourceId) return;
    if (!confirm('Merge the other profile into this one? The other candidate record will be deleted.')) return;
    setMerging(true);
    try {
      const res = await fetch('/api/ats/candidates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: selectedCandidate.id, sourceId: mergeSourceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Merge failed');
      showToast(`Merged “${data.sourceName}” into this profile.`, 'success');
      setShowMerge(false);
      setMergeSourceId(null);
      fetchCandidates();
      fetchActivities(selectedCandidate.id);
      fetchDocuments(selectedCandidate.id);
      fetchCandidateApps(selectedCandidate.id);
      fetchDuplicates(selectedCandidate.id);
      if (data.candidate) setSelectedCandidate(data.candidate);
    } catch (ex) {
      showToast(ex.message || 'Merge failed', 'error');
    } finally {
      setMerging(false);
    }
  };

  const formatBytes = (n) => {
    if (!n) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openDocument = async (doc) => {
    try {
      const url = doc.downloadUrl || `/api/ats/documents/${doc.id}/file`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      window.open(obj, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(obj), 60_000);
    } catch {
      showToast('Could not open document.', 'error');
    }
  };

  const generateSummary = async () => {
    setIsSummarizing(true);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const res = await fetch(`/api/ats/copilot/summarize/${selectedCandidate.id}`, { method: 'POST', headers: { 'X-Gemini-Key': apiKey } });
      if (res.ok) setCopilotSummary((await res.json()).summary);
      else showToast('Failed to generate summary');
    } catch(e) { console.error(e); }
    setIsSummarizing(false);
  };

  const draftEmail = async () => {
    if (!draftJobId) return;
    setIsDrafting(true);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const res = await fetch(`/api/ats/copilot/draft-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gemini-Key': apiKey },
        body: JSON.stringify({ candidateId: selectedCandidate.id, jobId: parseInt(draftJobId) })
      });
      if (res.ok) setCopilotDraft((await res.json()).draft);
      else showToast('Failed to draft email');
    } catch(e) { console.error(e); }
    setIsDrafting(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCandidate) return;
    setPostingActivity(true);
    try {
      const res = await fetch(`/api/ats/candidates/${selectedCandidate.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activityType || 'Note', content: newNote.trim() })
      });
      if (res.ok) {
        setNewNote('');
        fetchActivities(selectedCandidate.id);
        showToast(`${activityType || 'Note'} logged.`, 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Could not save activity.', 'error');
      }
    } catch(e) {
      showToast('Could not save activity.', 'error');
    } finally {
      setPostingActivity(false);
    }
  };

  const filteredActivities = activities.filter(a =>
    activityFilter === 'All' || (a.type || '').toLowerCase() === activityFilter.toLowerCase()
  );

  const handleQuickParse = async () => {
    if (!quickParseText.trim()) return;
    setIsParsing(true);
    const res = await fetch('/api/ats/candidates/quick-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: quickParseText })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const conf = data.confidence != null ? ` · ${data.confidence}% confidence` : '';
      showToast(`ATS Pro Intelligence: candidate added${conf}`, 'success');
      setShowQuickParse(false);
      setQuickParseText('');
      fetchCandidates();
    } else {
      const err = await res.text();
      showToast(err || 'Parsing failed.', 'error');
    }
    setIsParsing(false);
  };

  // Selections
  const toggleSelect = (id) => {
    const next = new Set(activeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActiveIds(next);
  };

  const toggleSelectAll = () => {
    if (activeIds.size === filtered.length) {
      setActiveIds(new Set());
    } else {
      setActiveIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkJobId) return;
    await fetch('/api/ats/candidates/mass-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds: Array.from(activeIds), jobId: parseInt(bulkJobId) })
    });
    showToast('Candidates mass assigned!', 'success');
    setShowBulkAssign(false);
    setActiveIds(new Set());
  };

  const handleAddToHotlist = async () => {
    if (!hotlistPickId) {
      showToast('Pick a hotlist first.', 'error');
      return;
    }
    const res = await fetch(`/api/ats/hotlists/${hotlistPickId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds: Array.from(activeIds) }),
    });
    if (res.ok) {
      const d = await res.json();
      showToast(`Added ${d.added ?? 0} to hotlist` + (d.skipped ? ` (${d.skipped} already in list)` : ''), 'success');
      setShowAddHotlist(false);
      setActiveIds(new Set());
      loadHotlists();
    } else {
      showToast('Could not add to hotlist.', 'error');
    }
  };

  const applySavedSearch = (id) => {
    setSavedSearchPick(id);
    if (!id) return;
    const s = savedSearches.find(x => String(x.id) === String(id));
    if (!s) return;
    try {
      const f = JSON.parse(s.filtersJson || '{}');
      setSearch(f.search || '');
      setSearchScope(f.searchScope || 'All');
      setExpFilter(f.expFilter || 'All');
      setAuthFilter(f.authFilter || 'All');
      showToast(`Applied “${s.name}”`, 'success');
    } catch {
      showToast('Invalid saved search filters.', 'error');
    }
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    const filtersJson = JSON.stringify({ search, searchScope, expFilter, authFilter });
    const res = await fetch('/api/ats/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveSearchName.trim(), filtersJson }),
    });
    if (res.ok) {
      const s = await res.json();
      showToast(`Saved search “${s.name}”`, 'success');
      setShowSaveSearch(false);
      setSaveSearchName('');
      loadSavedSearches();
      setSavedSearchPick(String(s.id));
    } else {
      showToast('Could not save search.', 'error');
    }
  };

  const deleteSavedSearch = async (id) => {
    if (!id) return;
    await fetch(`/api/ats/saved-searches/${id}`, { method: 'DELETE' });
    setSavedSearchPick('');
    loadSavedSearches();
    showToast('Saved search deleted', 'success');
  };

  const openBulkEmail = async () => {
    setShowBulkEmail(true);
    try {
      const [tplRes, stRes] = await Promise.all([
        fetch('/api/ats/email/templates'),
        fetch('/api/ats/email/status'),
      ]);
      if (tplRes.ok) {
        const t = await tplRes.json();
        setEmailTemplates(Array.isArray(t) ? t : []);
      }
      if (stRes.ok) {
        const s = await stRes.json();
        setEmailSmtpMode(s.mode || (s.configured ? 'smtp' : 'log_only'));
      }
    } catch { /* ignore */ }
  };

  const applyTemplate = (id) => {
    setSelectedTemplateId(id);
    const t = emailTemplates.find(x => String(x.id) === String(id));
    if (!t) return;
    setBulkEmailSubject(t.subject || '');
    setBulkEmailBody(t.body || '');
  };

  const handleBulkEmail = async () => {
    if (!bulkEmailSubject.trim() || !bulkEmailBody.trim()) {
      showToast('Subject and body are required.', 'error');
      return;
    }
    setBulkEmailSending(true);
    try {
      const res = await fetch('/api/ats/candidates/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: Array.from(activeIds),
          subject: bulkEmailSubject,
          body: bulkEmailBody,
          templateId: selectedTemplateId ? parseInt(selectedTemplateId, 10) : null,
          jobId: bulkJobId ? parseInt(bulkJobId, 10) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mode === 'log_only' || data.loggedOnly > 0) {
          showToast(
            `SMTP off: logged ${data.loggedOnly ?? 0} to timeline` +
              (data.sent ? ` · sent ${data.sent}` : '') +
              (data.failed ? ` · failed ${data.failed}` : '') +
              (data.skipped ? ` · skipped ${data.skipped}` : '') +
              '. Configure SMTP in Settings → Email.',
            data.sent > 0 ? 'success' : 'error'
          );
        } else {
          showToast(
            `Sent ${data.sent ?? 0}` +
              (data.failed ? ` · failed ${data.failed}` : '') +
              (data.skipped ? ` · skipped ${data.skipped}` : ''),
            data.failed > 0 && data.sent === 0 ? 'error' : 'success'
          );
        }
        setShowBulkEmail(false);
        setActiveIds(new Set());
        setBulkEmailSubject('');
        setBulkEmailBody('');
        setSelectedTemplateId('');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Bulk email failed.', 'error');
      }
    } catch {
      showToast('Bulk email failed.', 'error');
    } finally {
      setBulkEmailSending(false);
    }
  };

  // Sourcing Filter
  const filtered = candidates.filter(c => {
    // Search Scope
    const nameMatch = c.name?.toLowerCase().includes(search.toLowerCase());
    const emailMatch = c.email?.toLowerCase().includes(search.toLowerCase());
    const skillsMatch = c.skillsJson?.toLowerCase().includes(search.toLowerCase());
    const locMatch = (c.city + ' ' + c.state)?.toLowerCase().includes(search.toLowerCase());
    
    let matchesSearch = true;
    if (search.trim()) {
      if (searchScope === 'Name') matchesSearch = nameMatch;
      else if (searchScope === 'Email') matchesSearch = emailMatch;
      else if (searchScope === 'Skill') matchesSearch = skillsMatch;
      else if (searchScope === 'Location') matchesSearch = locMatch;
      else matchesSearch = nameMatch || emailMatch || skillsMatch || locMatch || c.role?.toLowerCase().includes(search.toLowerCase());
    }

    const matchesExp = expFilter === 'All' || c.experience?.toLowerCase().includes(expFilter.toLowerCase());
    const matchesAuth = authFilter === 'All' || c.workAuthorization?.toLowerCase() === authFilter.toLowerCase();
    const matchesDesk = deskMode !== 'mine' || isMine(c.ownership, user);
    
    return matchesSearch && matchesExp && matchesAuth && matchesDesk;
  });

  return (
    <div style={{ padding: '28px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: 'var(--surface)', border: `1px solid ${toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)'}`,
          padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideRight 0.3s cubic-bezier(0.16,1,0.3,1)'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} color="var(--rose)" /> : <CheckCircle size={16} color="var(--emerald)" />}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{toast.msg}</span>
          <button className="btn-icon" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setCandidateToDelete(null)} />
          <div className="drawer" style={{ zIndex: 101, width: 400, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16 }}>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={20} color="var(--danger)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Delete Candidate</h3>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this candidate? This will remove all associated submissions.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCandidateToDelete(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }} onClick={() => handleDelete(candidateToDelete)}>Delete</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Applicants Command Center
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            Sourcing, parsing, and pipeline operations
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" title="Export CSV" onClick={() => downloadCsvExport('candidates').catch(e => alert(e.message))}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-ghost" onClick={() => setShowQuickParse(true)}>
            <TerminalSquare size={14} /> Quick Parse Text
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display:'none' }} onChange={onFileChange} />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <><div className="anim-spin" style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%'}} /> Parsing...</>
            ) : (
              <><Upload size={14} /> Upload Resume</>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, animationDelay: '0.05s' }}>
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><Users size={18} color="var(--primary)" /></div>
          <div className="kpi-val">{candidates.length}</div>
          <div className="kpi-label">Active Talent Bench</div>
        </div>
        <div className="kpi-card kpi-success">
          <div className="kpi-icon" style={{ background: 'var(--success-soft)' }}><Briefcase size={18} color="var(--success)" /></div>
          <div className="kpi-val">{candidates.filter(c => c.experience?.toLowerCase().includes('senior') || c.experience?.toLowerCase().includes('lead')).length}</div>
          <div className="kpi-label">Senior Level Engineers</div>
        </div>
        <div className="kpi-card kpi-muted">
          <div className="kpi-icon" style={{ background: 'var(--surface-3)' }}><Zap size={18} color="var(--text-2)" /></div>
          <div className="kpi-val">{candidates.filter(c => c.workAuthorization?.toLowerCase().includes('citizen') || c.workAuthorization?.toLowerCase().includes('green')).length}</div>
          <div className="kpi-label">US Authorized Stars</div>
        </div>
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><Globe size={18} color="var(--primary)" /></div>
          <div className="kpi-val">{candidates.filter(c => c.source?.toLowerCase().includes('parser') || c.source?.toLowerCase().includes('parse')).length}</div>
          <div className="kpi-label">Resumes Parsed by AI</div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      {candidates.length === 0 && (
        <div
          className={`drop-zone anim-fade-up${dragging ? ' over' : ''}`}
          style={{ animationDelay: '0.05s' }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUpload size={40} color={dragging ? 'var(--primary)' : 'var(--text-4)'} style={{ margin: '0 auto 14px' }} />
          <p style={{ fontSize:15, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>
            Drag and drop resume PDF here
          </p>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>PDF / Word · ATS Pro Intelligence (in-app, no external AI)</p>
        </div>
      )}

      {/* Sourcing Filters toolbar */}
      {candidates.length > 0 && (
        <div className="anim-fade-up" style={{ display:'flex', gap:12, flexWrap:'wrap', animationDelay:'0.08s', alignItems:'center' }}>
          {/* Search Input with dropdown scope selection */}
          <div className="input-search" style={{ flex:1, minWidth:320 }}>
            <Search size={14} color="var(--text-3)" style={{flexShrink:0}} />
            <select 
              value={searchScope} 
              onChange={e=>setSearchScope(e.target.value)} 
              style={{
                background:'none', border:'none', color:'var(--text-2)', fontSize:12.5, fontWeight:600,
                borderRight:'1px solid var(--border)', paddingRight:10, marginRight:6, outline:'none', cursor:'pointer'
              }}
            >
              <option value="All">Search Any</option>
              <option value="Name">Name</option>
              <option value="Email">Email</option>
              <option value="Skill">Skill</option>
              <option value="Location">Location</option>
            </select>
            <input
              placeholder="Type keyword..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
            {search && (
              <button className="btn-icon" style={{width:20,height:20}} onClick={()=>setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Desk scope */}
          <div className="tab-bar">
            <button type="button" className={`tab${deskMode==='all'?' active':''}`} onClick={() => setDeskMode('all')}>All desk</button>
            <button type="button" className={`tab${deskMode==='mine'?' active':''}`} onClick={() => setDeskMode('mine')}>My desk</button>
          </div>

          {/* Experience level */}
          <div className="tab-bar">
            {EXP_FILTERS.map(f => (
              <button key={f} className={`tab${expFilter===f?' active':''}`} onClick={()=>setExpFilter(f)}>{f}</button>
            ))}
          </div>

          {/* Work Auth */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>Work Auth:</span>
            <select 
              className="input" 
              style={{ width:120, height:34, padding:'0 8px', fontSize:12.5, background:'var(--surface-2)' }} 
              value={authFilter} 
              onChange={e=>setAuthFilter(e.target.value)}
            >
              {WORK_AUTH_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Saved searches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bookmark size={14} color="var(--text-3)" />
            <select
              className="input"
              style={{ minWidth: 140, height: 34, padding: '0 8px', fontSize: 12.5, background: 'var(--surface-2)' }}
              value={savedSearchPick}
              onChange={e => applySavedSearch(e.target.value)}
            >
              <option value="">Saved searches…</option>
              {savedSearches.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px', height: 34 }} onClick={() => setShowSaveSearch(true)} title="Save current filters">
              <Save size={13} /> Save
            </button>
            {savedSearchPick && (
              <button type="button" className="btn-icon" title="Delete saved search" onClick={() => deleteSavedSearch(savedSearchPick)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Candidates Data Table */}
      {filtered.length > 0 && (
        <div className="card anim-fade-up" style={{ animationDelay:'0.12s', overflow:'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input type="checkbox" onChange={toggleSelectAll} checked={filtered.length > 0 && activeIds.size === filtered.length} />
                  </th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>APPLICANT</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>CURRENT ROLE</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>WORK AUTH</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>OWNERSHIP</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>SOURCE</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600, width:140 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const [fg, bg] = getAvatarColors(c.name);
                  return (
                    <tr key={c.id} className="trow" style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <input type="checkbox" checked={activeIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="avatar" style={{ background: bg, color: fg, width:34, height:34, fontSize:12.5 }}>{getInitials(c.name)}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</div>
                            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-3)', marginTop: 2, alignItems: 'center' }}>
                              <span>{c.email}</span>
                              {c.city && <span>• {c.city}, {c.state}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>{c.role || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{c.experience || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                        <span style={{
                          padding: '3px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: c.workAuthorization?.includes('Citizen') ? 'var(--success-soft)' : 'var(--surface-2)',
                          color: c.workAuthorization?.includes('Citizen') ? 'var(--emerald)' : 'var(--text-2)'
                        }}>
                          {c.workAuthorization || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <User size={12} color="var(--text-4)" /> {c.ownership || 'Unassigned'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{c.source || 'Parser'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12, height:30 }} onClick={() => handleSelectCandidate(c)}>
                            View Snapshot
                          </button>
                          <button className="btn-icon btn-danger-ghost" style={{ width:30, height:30 }} onClick={() => setCandidateToDelete(c.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && candidates.length > 0 && (
        <div className="card empty-state anim-fade-up">
          <Search size={32} />
          <p style={{ fontSize:15, fontWeight:600, color:'var(--text-2)' }}>No matching profiles found</p>
          <p style={{ fontSize:13 }}>Adjust your search scopes or toggles</p>
        </div>
      )}

      {/* Floating Action Bar */}
      {activeIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '10px 20px',
          borderRadius: 99, display: 'flex', alignItems: 'center', gap: 16, zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeUp 0.2s ease both'
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
            {activeIds.size} Selected
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { loadHotlists(); setShowAddHotlist(true); }}>
            <Flame size={14} /> Add to hotlist
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowBulkAssign(true)}>
            <LayoutList size={14} /> Mass Assign Requirement
          </button>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={openBulkEmail}>
            <Send size={14} /> Send Mass Email
          </button>
        </div>
      )}

      {/* Add to hotlist modal */}
      {showAddHotlist && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowAddHotlist(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 400, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Add to hotlist ({activeIds.size})</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
              Create hotlists under Hotlists in the sidebar if the list is empty.
            </p>
            <select className="input" value={hotlistPickId} onChange={e => setHotlistPickId(e.target.value)} style={{ background: 'var(--surface-2)' }}>
              <option value="">Select hotlist…</option>
              {hotlists.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.memberCount ?? 0})</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddHotlist(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={!hotlistPickId} onClick={handleAddToHotlist}>
                <Flame size={14} /> Add
              </button>
            </div>
          </div>
        </>
      )}

      {/* Merge duplicate modal */}
      {showMerge && selectedCandidate && (
        <>
          <div className="overlay" style={{ zIndex: 120 }} onClick={() => setShowMerge(false)} />
          <div className="drawer" style={{
            zIndex: 121, width: 440, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            height: 'auto', borderRadius: 16, padding: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitMerge size={18} color="var(--primary)" /> Merge duplicates
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
              Keep <strong style={{ color: 'var(--text-1)' }}>{selectedCandidate.name}</strong> (#{selectedCandidate.id}).
              Choose a profile to absorb into it. Skills, docs, pipeline, and activities move over; the other record is deleted.
            </p>
            <label className="label">SOURCE TO MERGE (WILL BE DELETED)</label>
            <select
              className="input"
              style={{ background: 'var(--surface-2)', marginBottom: 16 }}
              value={mergeSourceId || ''}
              onChange={e => setMergeSourceId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Select duplicate…</option>
              {dupMatches.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.match} · {m.email || m.phone || `#${m.id}`}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowMerge(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={!mergeSourceId || merging} onClick={handleMerge}>
                {merging ? 'Merging…' : 'Merge into this profile'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Save search modal */}
      {showSaveSearch && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowSaveSearch(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 400, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Save current search</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
              Stores keyword, scope, experience, and work auth filters.
            </p>
            <input className="input" placeholder="e.g. Senior H1B React" value={saveSearchName} onChange={e => setSaveSearchName(e.target.value)} autoFocus />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowSaveSearch(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={!saveSearchName.trim()} onClick={handleSaveSearch}>
                <Bookmark size={14} /> Save
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick Parse Modal */}
      {showQuickParse && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowQuickParse(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 500, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Fast Sourcing AI</h3>
              <button className="btn-icon" onClick={() => setShowQuickParse(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              Paste raw text from LinkedIn or a resume. ATS Pro Intelligence extracts name, skills, location, and work auth entirely in-app.
            </p>
            <textarea 
              className="input" 
              style={{ width: '100%', minHeight: 200, fontSize: 12, fontFamily: 'monospace' }} 
              placeholder="Paste LinkedIn or resume text here..."
              value={quickParseText}
              onChange={e => setQuickParseText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowQuickParse(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={isParsing || !quickParseText.trim()} onClick={handleQuickParse}>
                {isParsing ? 'Parsing...' : 'Extract & Save Candidate'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bulk Email Modal */}
      {showBulkEmail && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowBulkEmail(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 520, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', maxHeight: '90vh', overflowY: 'auto', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
              Send email ({activeIds.size} candidates)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
              Tokens: {'{{FirstName}}'}, {'{{Name}}'}, {'{{Role}}'}, {'{{JobTitle}}'}, {'{{JobCode}}'}, {'{{Location}}'}
              {emailSmtpMode === 'log_only' && (
                <span style={{ display: 'block', marginTop: 6, color: 'var(--warning)' }}>
                  SMTP not configured — messages will be logged to the activity timeline only. Set up Email in Settings.
                </span>
              )}
              {emailSmtpMode === 'smtp' && (
                <span style={{ display: 'block', marginTop: 6, color: 'var(--success)' }}>
                  SMTP ready — emails will be sent for real.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: 11 }}>TEMPLATE</label>
                <select
                  className="input"
                  value={selectedTemplateId}
                  onChange={e => applyTemplate(e.target.value)}
                  style={{ background: 'var(--surface-2)' }}
                >
                  <option value="">Custom message…</option>
                  {emailTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" style={{ fontSize: 11 }}>OPTIONAL JOB (for {'{{JobTitle}}'} tokens)</label>
                <select className="input" value={bulkJobId} onChange={e => setBulkJobId(e.target.value)} style={{ background: 'var(--surface-2)' }}>
                  <option value="">No job context</option>
                  {jobs.filter(j => j.status === 'Active').map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
              <input className="input" placeholder="Subject" value={bulkEmailSubject} onChange={e => setBulkEmailSubject(e.target.value)} />
              <textarea className="input" placeholder="Email body…" style={{ minHeight: 150 }} value={bulkEmailBody} onChange={e => setBulkEmailBody(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkEmail(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!bulkEmailSubject || !bulkEmailBody || bulkEmailSending} onClick={handleBulkEmail}>
                {bulkEmailSending ? 'Sending…' : (emailSmtpMode === 'smtp' ? 'Send email' : 'Log to timeline')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowBulkAssign(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 400, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Assign to Requirement ({activeIds.size} candidates)</h3>
            <select className="input" style={{ width: '100%', padding: '10px' }} value={bulkJobId} onChange={e=>setBulkJobId(e.target.value)}>
              <option value="">Select job requirement...</option>
              {jobs.filter(j=>j.status==='Active').map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkAssign(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!bulkJobId} onClick={handleBulkAssign}>
                Link & Assign
              </button>
            </div>
          </div>
        </>
      )}

      {/* Profile Snapshot Drawer */}
      {selectedCandidate && (
        <>
          <div className="overlay" onClick={()=>handleSelectCandidate(null)} />
          <div style={{
            position:'fixed', inset:0, zIndex:51,
            display:'flex', alignItems:'stretch',
            animation:'fadeIn 0.2s ease both',
          }}>
            <div style={{ flex:1 }} onClick={()=>handleSelectCandidate(null)} />
            <div style={{
              width:'90vw', maxWidth: 1300, background:'var(--surface)', borderLeft:'1px solid var(--border)',
              display:'flex', flexDirection:'column',
              animation:'slideRight 0.32s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              {/* Profile Header */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {(() => { const [fg,bg]=getAvatarColors(selectedCandidate.name); return (
                    <div style={{ width:44,height:44,borderRadius:10,background:bg,color:fg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700 }}>
                      {getInitials(selectedCandidate.name)}
                    </div>
                  ); })()}
                  <div>
                    <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17.5, color:'var(--text-1)' }}>
                      {selectedCandidate.name}
                    </h2>
                    <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--text-3)', marginTop:3, alignItems:'center' }}>
                      <span>{selectedCandidate.role}</span>
                      <span>•</span>
                      <span>Auth: <strong>{selectedCandidate.workAuthorization || 'US Citizen'}</strong></span>
                      <span>•</span>
                      <span>Owner: <strong>{selectedCandidate.ownership || 'Unassigned'}</strong></span>
                    </div>
                  </div>
                </div>
                
                {/* Snapshot Tabs Selector */}
                <div className="tab-bar" style={{ marginLeft:'auto', marginRight:12 }}>
                  <button className={`tab${snapshotTab==='profile'?' active':''}`} onClick={()=>setSnapshotTab('profile')}>Overview</button>
                  <button className={`tab${snapshotTab==='pipeline'?' active':''}`} onClick={()=>setSnapshotTab('pipeline')}>Timeline</button>
                </div>

                {!editing ? (
                  <button className="btn btn-ghost" style={{ fontSize: 12.5, marginRight: 8 }} onClick={startEdit}>
                    <Pencil size={13} /> Edit
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6, marginRight: 8 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => { setEditing(false); setEditForm(null); }}>Cancel</button>
                    <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={saveEdit} disabled={savingEdit}>
                      <Save size={13} /> {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}

                {dupMatches.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, marginRight: 6, color: 'var(--warning)', borderColor: 'rgba(180,83,9,0.3)' }}
                    onClick={() => setShowMerge(true)}
                    title="Possible duplicates found"
                  >
                    <GitMerge size={13} /> {dupMatches.length} dup
                  </button>
                )}

                <button className="btn-icon" onClick={()=>handleSelectCandidate(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Main Snapshot Body */}
              <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
                {snapshotTab === 'profile' ? (
                  <>
                    {/* Left: General & AI Copilot Details */}
                    <div style={{ width: 360, borderRight:'1px solid var(--border)', padding:'20px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:20 }}>
                      <section>
                        <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>
                          {editing ? 'EDIT PROFILE' : 'CONTACT'}
                        </p>
                        {editing && editForm ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                              ['Name', 'name'], ['Role', 'role'], ['Email', 'email'], ['Phone', 'phone'],
                              ['Experience', 'experience'], ['Education', 'education'],
                              ['City', 'city'], ['State', 'state'],
                            ].map(([label, key]) => (
                              <div key={key}>
                                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>{label}</label>
                                <input className="input" style={{ width: '100%', fontSize: 12.5, padding: '7px 10px' }}
                                  value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
                              </div>
                            ))}
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Owner</label>
                              <select
                                className="input"
                                style={{ width: '100%', fontSize: 12.5, padding: '7px 10px' }}
                                value={editForm.ownership || ''}
                                onChange={e => setEditForm({ ...editForm, ownership: e.target.value })}
                              >
                                <option value="">Unassigned</option>
                                {team.map(t => (
                                  <option key={t.id} value={t.name}>{t.name} ({t.role || t.roles?.[0]})</option>
                                ))}
                                {editForm.ownership && !team.some(t => t.name === editForm.ownership) && (
                                  <option value={editForm.ownership}>{editForm.ownership}</option>
                                )}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Work auth</label>
                              <select className="input" style={{ width: '100%', fontSize: 12.5, padding: '7px 10px' }}
                                value={editForm.workAuthorization}
                                onChange={e => setEditForm({ ...editForm, workAuthorization: e.target.value })}>
                                {['US Citizen', 'Green Card', 'H1B', 'OPT', 'W2', 'C2C', 'Other'].map(a => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Status</label>
                              <select className="input" style={{ width: '100%', fontSize: 12.5, padding: '7px 10px' }}
                                value={editForm.status}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                {['Active', 'Hired', 'Blacklisted'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Skills (comma-separated)</label>
                              <textarea className="input" rows={3} style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', resize: 'vertical' }}
                                value={editForm.skills} onChange={e => setEditForm({ ...editForm, skills: e.target.value })} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                              <Mail size={14} color="var(--text-3)" /> {selectedCandidate.email || 'No email stored'}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                              <Phone size={14} color="var(--text-3)" /> {selectedCandidate.phone || 'No phone stored'}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                              <MapPin size={14} color="var(--text-3)" /> {selectedCandidate.city ? `${selectedCandidate.city}, ${selectedCandidate.state}` : 'No location parsed'}
                            </div>
                          </div>
                        )}
                      </section>

                      <div style={{ height:1, background:'var(--border)' }} />

                      {/* AI Sourcing Copilot */}
                      <section style={{ padding: '16px', background: 'var(--primary-glow)', borderRadius: 12, border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Zap size={14} color="var(--primary-light)" />
                          <p style={{ fontSize:11, fontWeight:800, color:'var(--primary-light)', letterSpacing:'0.08em' }}>SYS_CO_PILOT</p>
                        </div>

                        {/* AI Summary */}
                        <div style={{ marginBottom: 16 }}>
                          {!copilotSummary ? (
                            <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px' }} onClick={generateSummary} disabled={isSummarizing}>
                              {isSummarizing ? 'Summarizing...' : 'Summarize Profile'}
                            </button>
                          ) : (
                            <div style={{ fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.5, background: 'var(--surface-2)', padding: 12, borderRadius: 8, whiteSpace: 'pre-line' }}>
                              {copilotSummary}
                            </div>
                          )}
                        </div>

                        {/* Pitch Email Draft */}
                        <div>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <select className="input" style={{ flex: 1, padding: '6px', fontSize: 12 }} value={draftJobId} onChange={e=>setDraftJobId(e.target.value)}>
                              <option value="">Pitch for Job...</option>
                              {jobs.filter(j=>j.status==='Active').map(j => (
                                <option key={j.id} value={j.id}>{j.title}</option>
                              ))}
                            </select>
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={!draftJobId || isDrafting} onClick={draftEmail}>
                              {isDrafting ? 'Drafting...' : 'Pitch'}
                            </button>
                          </div>
                          {copilotDraft && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <textarea className="input" style={{ width: '100%', minHeight: 120, fontSize: 12, resize: 'vertical' }} value={copilotDraft} onChange={e=>setCopilotDraft(e.target.value)} />
                              <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px' }} onClick={() => {
                                showToast('Outreach dispatched via SMTP node!', 'success');
                                setCopilotDraft('');
                              }}>
                                <Send size={14} /> Send Pitch Email
                              </button>
                            </div>
                          )}
                        </div>
                      </section>

                      <div style={{ height:1, background:'var(--border)' }} />

                      {/* General Bio Info */}
                      <section>
                        <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>EXPERIENCE PROFILE</p>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                          <Briefcase size={14} color="var(--text-3)" style={{ marginTop:2, flexShrink:0 }} />
                          <div>
                            <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{selectedCandidate.role}</div>
                            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{selectedCandidate.experience}</div>
                            <div style={{ fontSize:11, color:'var(--text-4)', marginTop:4 }}>Source: {selectedCandidate.source}</div>
                          </div>
                        </div>
                      </section>

                      {/* Document vault */}
                      <div style={{ height:1, background:'var(--border)' }} />
                      <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em' }}>
                            DOCUMENTS ({documents.length})
                          </p>
                          <FolderOpen size={13} color="var(--text-4)" />
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                          <select
                            className="input"
                            style={{ flex: 1, fontSize: 11.5, padding: '5px 8px', background: 'var(--surface-2)' }}
                            value={docType}
                            onChange={e => setDocType(e.target.value)}
                          >
                            {['Resume', 'Offer', 'NDA', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <input ref={docInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleDocUpload} />
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: 11.5, padding: '5px 10px' }}
                            disabled={docUploading}
                            onClick={() => docInputRef.current?.click()}
                          >
                            <Upload size={12} /> {docUploading ? '…' : 'Upload'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                          {documents.map(d => (
                            <div key={d.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                              borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)',
                            }}>
                              <FileText size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {d.fileName}
                                </div>
                                <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>
                                  {d.docType} · {formatBytes(d.sizeBytes)}
                                </div>
                              </div>
                              <button type="button" className="btn-icon" title="Open" onClick={() => openDocument(d)}>
                                <ExternalLink size={13} />
                              </button>
                              <button type="button" className="btn-icon" title="Delete" onClick={() => handleDeleteDoc(d.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                          {documents.length === 0 && (
                            <p style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: 8 }}>No files yet</p>
                          )}
                        </div>
                      </section>

                      {/* Duplicates / merge */}
                      {dupMatches.length > 0 && (
                        <>
                          <div style={{ height:1, background:'var(--border)' }} />
                          <section>
                            <p style={{ fontSize:10.5, fontWeight:700, color:'var(--warning)', letterSpacing:'0.08em', marginBottom:10 }}>
                              POSSIBLE DUPLICATES ({dupMatches.length})
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {dupMatches.map(m => (
                                <div key={m.id} style={{
                                  padding: 10, borderRadius: 8, border: '1px solid rgba(180,83,9,0.25)', background: 'var(--warning-soft)',
                                }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{m.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                    via {m.match} · {m.email || m.phone || '—'}
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ marginTop: 8, fontSize: 11.5, padding: '4px 10px', width: '100%' }}
                                    onClick={() => { setMergeSourceId(m.id); setShowMerge(true); }}
                                  >
                                    <GitMerge size={12} /> Merge into this profile
                                  </button>
                                </div>
                              ))}
                            </div>
                          </section>
                        </>
                      )}

                      {selectedCandidate.education && (
                        <>
                          <div style={{ height:1, background:'var(--border)' }} />
                          <section>
                            <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>EDUCATION</p>
                            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                              <GraduationCap size={14} color="var(--text-3)" style={{ marginTop:2, flexShrink:0 }} />
                              <div style={{ fontSize:13, color:'var(--text-2)' }}>{selectedCandidate.education}</div>
                            </div>
                          </section>
                        </>
                      )}

                      <div style={{ height:1, background:'var(--border)' }} />

                      {/* Skills Tags */}
                      <section>
                        <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>SKILLS TAGS</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {(() => { try { return JSON.parse(selectedCandidate.skillsJson||'[]'); } catch { return []; } })()
                            .map((skill,i) => (
                              <span key={i} style={{
                                padding:'4px 10px', borderRadius:99,
                                fontSize:11.5, fontWeight:600,
                                background:'var(--primary-glow)', color:'var(--primary-light)',
                                border:'1px solid rgba(37,99,235,0.25)',
                              }}>{skill}</span>
                            ))}
                        </div>
                      </section>
                    </div>

                    {/* Right: Embedded Resume Preview */}
                    <div style={{ flex:1, background:'var(--bg)', padding:16, overflow:'hidden' }}>
                      {selectedCandidate.resumeFilePath ? (
                        <iframe
                          src={selectedCandidate.resumeFilePath}
                          style={{ width:'100%', height:'100%', border:'none', borderRadius:10 }}
                          title="Resume File"
                        />
                      ) : (
                        <div className="empty-state" style={{ height:'100%' }}>
                          <FileText size={40} />
                          <p style={{ fontSize:14 }}>No resume attachment available</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* TAB 2: Activity timeline & pipeline */
                  <div style={{ flex:1, display:'grid', gridTemplateColumns:'1.2fr 0.8fr', gap:0, overflow:'hidden' }}>
                    {/* Left: Activity timeline */}
                    <div style={{ display:'flex', flexDirection:'column', gap:14, borderRight:'1px solid var(--border)', padding:24, overflow:'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em' }}>
                          ACTIVITY TIMELINE
                        </h4>
                        <span style={{ fontSize: 11.5, color: 'var(--text-4)' }}>{filteredActivities.length} of {activities.length}</span>
                      </div>

                      {/* Composer */}
                      <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {ACTIVITY_TYPES.map(t => {
                            const Icon = t.icon;
                            const on = activityType === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className="btn"
                                onClick={() => setActivityType(t.id)}
                                style={{
                                  fontSize: 11.5, padding: '5px 10px',
                                  background: on ? 'var(--primary-glow)' : '#fff',
                                  color: on ? 'var(--primary)' : 'var(--text-2)',
                                  border: `1px solid ${on ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`,
                                }}
                              >
                                <Icon size={12} /> {t.label}
                              </button>
                            );
                          })}
                        </div>
                        <textarea
                          className="input"
                          placeholder={
                            activityType === 'Call' ? 'Call summary, outcome, next steps…'
                              : activityType === 'Email' ? 'Log an email you sent outside the app…'
                              : activityType === 'Meeting' ? 'Interview / meeting notes…'
                              : 'Note, callback summary, or @mention a teammate…'
                          }
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          style={{ minHeight: 88, resize: 'vertical', fontSize: 13, background: '#fff' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>@name notifies via in-app alerts</span>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 16px', fontSize: 12.5 }}
                            disabled={!newNote.trim() || postingActivity}
                            onClick={handleAddNote}
                          >
                            <MessageSquare size={13} /> {postingActivity ? 'Saving…' : `Log ${activityType}`}
                          </button>
                        </div>
                      </div>

                      {/* Filters */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {ACTIVITY_FILTERS.map(f => (
                          <button
                            key={f}
                            type="button"
                            className={`tab${activityFilter === f ? ' active' : ''}`}
                            onClick={() => setActivityFilter(f)}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {/* Feed */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', flex: 1, paddingLeft: 4 }}>
                        {filteredActivities.map((act, idx) => {
                          const meta = activityMeta(act.type);
                          const Icon = meta.Icon;
                          return (
                            <div key={act.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: 8, background: meta.bg, color: meta.color,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: '1px solid var(--border)',
                                }}>
                                  <Icon size={13} />
                                </div>
                                {idx < filteredActivities.length - 1 && (
                                  <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 16 }} />
                                )}
                              </div>
                              <div style={{
                                flex: 1, padding: '10px 12px 16px 0',
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      {meta.label}
                                    </span>
                                    <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>
                                      {act.createdBy || 'System'}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: 11, color: 'var(--text-4)' }} title={act.createdAt ? new Date(act.createdAt).toLocaleString() : ''}>
                                    {timeAgoShort(act.createdAt)}
                                  </span>
                                </div>
                                <div style={{
                                  fontSize: 12.5, color: 'var(--text-1)', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                                  padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)',
                                }}>
                                  {act.content}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {filteredActivities.length === 0 && (
                          <div style={{ fontSize: 12.5, color: 'var(--text-4)', textAlign: 'center', padding: 28 }}>
                            {activities.length === 0
                              ? 'No activity yet — log a note, call, or email to start the trail.'
                              : 'No items match this filter.'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Pipeline apps */}
                    <div style={{ padding: 24, overflowY: 'auto', background: 'var(--bg)' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 16 }}>
                        PIPELINE ({candidateApps.length})
                      </h4>
                      {candidateApps.length === 0 ? (
                        <div style={{
                          padding: 16, borderRadius: 12, background: 'var(--surface)', border: '1px dashed var(--border)',
                          display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                        }}>
                          <ClipboardCheck size={24} color="var(--text-4)" />
                          <div style={{ fontSize: 13.5, color: 'var(--text-2)', fontWeight: 600 }}>No active pipeline rows</div>
                          <p style={{ fontSize: 11.5, color: 'var(--text-4)', margin: 0 }}>Use Mass Assign or a job’s Talent Match to add this candidate.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {candidateApps.map(app => (
                            <div
                              key={app.id}
                              style={{
                                padding: 14, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)',
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)' }}>{app.jobTitle || `Job #${app.jobId}`}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                                {app.jobCode || '—'} · match {app.matchScore ?? 0}%
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                <span className="badge badge-primary" style={{ fontSize: 10 }}>{app.stage}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{timeAgoShort(app.appliedAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
