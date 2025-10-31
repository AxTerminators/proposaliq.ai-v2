import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  StickyNote,
  Mic,
  Plus,
  Search,
  Trash2,
  Pin,
  Tag,
  Clock,
  FileText,
  Pause,
  Play,
  StopCircle,
  Download,
  Copy,
  Sparkles,
  Link as LinkIcon,
  X,
  Filter,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const NOTE_TYPES = [
  { value: "quick_note", label: "Quick Note", icon: StickyNote, color: "yellow" },
  { value: "voice_memo", label: "Voice Memo", icon: Mic, color: "purple" },
  { value: "meeting_notes", label: "Meeting Notes", icon: Calendar, color: "blue" },
  { value: "idea", label: "Idea", icon: Sparkles, color: "pink" },
  { value: "todo", label: "To-Do", icon: FileText, color: "green" }
];

export default function QuickNotesSystem({ user, organization, context }) {
  const queryClient = useQueryClient();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const [noteData, setNoteData] = useState({
    title: "",
    content: "",
    note_type: "quick_note",
    tags: [],
    is_pinned: false,
    linked_proposal_id: context?.proposal_id || null,
    linked_client_id: context?.client_id || null
  });

  // Store notes in user data
  const { data: notes = [] } = useQuery({
    queryKey: ['quick-notes', user.email],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.quick_notes || [];
    },
    initialData: []
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (updatedNotes) => {
      return base44.auth.updateMe({
        quick_notes: updatedNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-notes'] });
      toast.success("Note saved");
    }
  });

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Could not access microphone");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const saveVoiceMemo = async () => {
    if (!audioBlob) return;

    // Upload audio file
    const file = new File([audioBlob], `voice-memo-${Date.now()}.webm`, { type: 'audio/webm' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const newNote = {
      id: Date.now().toString(),
      title: noteData.title || `Voice Memo - ${moment().format('MMM D, h:mm A')}`,
      content: noteData.content,
      note_type: "voice_memo",
      voice_url: file_url,
      voice_duration: recordingTime,
      tags: noteData.tags,
      is_pinned: noteData.is_pinned,
      linked_proposal_id: noteData.linked_proposal_id,
      linked_client_id: noteData.linked_client_id,
      created_date: new Date().toISOString()
    };

    saveNotesMutation.mutate([...notes, newNote]);
    resetForm();
    setShowNoteDialog(false);
  };

  const saveTextNote = () => {
    if (!noteData.title && !noteData.content) {
      toast.error("Please add a title or content");
      return;
    }

    const newNote = {
      id: Date.now().toString(),
      ...noteData,
      created_date: new Date().toISOString()
    };

    saveNotesMutation.mutate([...notes, newNote]);
    resetForm();
    setShowNoteDialog(false);
  };

  const deleteNote = (noteId) => {
    if (confirm("Delete this note?")) {
      const updated = notes.filter(n => n.id !== noteId);
      saveNotesMutation.mutate(updated);
    }
  };

  const togglePin = (noteId) => {
    const updated = notes.map(n => 
      n.id === noteId ? { ...n, is_pinned: !n.is_pinned } : n
    );
    saveNotesMutation.mutate(updated);
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const resetForm = () => {
    setNoteData({
      title: "",
      content: "",
      note_type: "quick_note",
      tags: [],
      is_pinned: false,
      linked_proposal_id: context?.proposal_id || null,
      linked_client_id: context?.client_id || null
    });
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const addTag = (tag) => {
    if (tag && !noteData.tags.includes(tag)) {
      setNoteData({ ...noteData, tags: [...noteData.tags, tag] });
    }
  };

  const removeTag = (index) => {
    setNoteData({ 
      ...noteData, 
      tags: noteData.tags.filter((_, i) => i !== index) 
    });
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === "all" || note.note_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Floating Quick Note Button */}
      <div className="fixed bottom-20 right-6 z-40">
        <Button
          onClick={() => setShowNoteDialog(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:scale-110 transition-all"
          title="Quick Note"
        >
          <StickyNote className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
              >
                All
              </Button>
              {NOTE_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={filterType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type.value)}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
            <Pin className="w-4 h-4" />
            Pinned Notes
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map(note => {
              const noteType = NOTE_TYPES.find(t => t.value === note.note_type);
              const Icon = noteType?.icon || StickyNote;
              const colorClasses = {
                yellow: "bg-amber-50 border-amber-200",
                purple: "bg-purple-50 border-purple-200",
                blue: "bg-blue-50 border-blue-200",
                pink: "bg-pink-50 border-pink-200",
                green: "bg-green-50 border-green-200"
              };

              return (
                <Card key={note.id} className={cn("border-2", colorClasses[noteType?.color] || "bg-slate-50")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <h4 className="font-semibold text-slate-900 truncate text-sm">
                          {note.title || 'Untitled Note'}
                        </h4>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => togglePin(note.id)} className="h-6 w-6">
                          <Pin className="w-3 h-3 fill-amber-600 text-amber-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteNote(note.id)} className="h-6 w-6">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {note.content && (
                      <p className="text-sm text-slate-600 mb-2 line-clamp-3">{note.content}</p>
                    )}

                    {note.voice_url && (
                      <div className="mb-2">
                        <audio controls className="w-full h-8">
                          <source src={note.voice_url} type="audio/webm" />
                        </audio>
                        <p className="text-xs text-slate-500 mt-1">
                          Duration: {formatRecordingTime(note.voice_duration || 0)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{moment(note.created_date).fromNow()}</span>
                      {note.content && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(note.content)}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Notes */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3">
          All Notes ({unpinnedNotes.length})
        </h3>
        {unpinnedNotes.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <StickyNote className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 mb-2">No notes yet</p>
              <p className="text-sm text-slate-500 mb-4">Capture quick thoughts and voice memos</p>
              <Button onClick={() => setShowNoteDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Note
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpinnedNotes.map(note => {
              const noteType = NOTE_TYPES.find(t => t.value === note.note_type);
              const Icon = noteType?.icon || StickyNote;
              const colorClasses = {
                yellow: "bg-amber-50 border-amber-200",
                purple: "bg-purple-50 border-purple-200",
                blue: "bg-blue-50 border-blue-200",
                pink: "bg-pink-50 border-pink-200",
                green: "bg-green-50 border-green-200"
              };

              return (
                <Card key={note.id} className={cn("border-2 hover:shadow-lg transition-shadow", colorClasses[noteType?.color] || "bg-slate-50")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <h4 className="font-semibold text-slate-900 truncate text-sm">
                          {note.title || 'Untitled Note'}
                        </h4>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => togglePin(note.id)} className="h-6 w-6">
                          <Pin className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteNote(note.id)} className="h-6 w-6">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {note.content && (
                      <p className="text-sm text-slate-600 mb-2 line-clamp-3">{note.content}</p>
                    )}

                    {note.voice_url && (
                      <div className="mb-2">
                        <audio controls className="w-full h-8">
                          <source src={note.voice_url} type="audio/webm" />
                        </audio>
                        <p className="text-xs text-slate-500 mt-1">
                          Duration: {formatRecordingTime(note.voice_duration || 0)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{moment(note.created_date).fromNow()}</span>
                      {note.content && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(note.content)}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick Note</DialogTitle>
            <DialogDescription>
              Capture a thought or record a voice memo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Note Type */}
            <div className="flex gap-2">
              {NOTE_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={noteData.note_type === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteData({ ...noteData, note_type: type.value })}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {type.label}
                  </Button>
                );
              })}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Input
                placeholder="Note title (optional)"
                value={noteData.title}
                onChange={(e) => setNoteData({ ...noteData, title: e.target.value })}
              />
            </div>

            {/* Voice Recording */}
            {noteData.note_type === 'voice_memo' && (
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  {!isRecording && !audioBlob && (
                    <Button onClick={startRecording} size="lg" className="bg-purple-600 hover:bg-purple-700">
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </Button>
                  )}

                  {isRecording && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-2xl font-bold text-slate-900">
                          {formatRecordingTime(recordingTime)}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-center">
                        {!isPaused ? (
                          <Button onClick={pauseRecording} variant="outline">
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        ) : (
                          <Button onClick={resumeRecording} variant="outline">
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        )}
                        <Button onClick={stopRecording} variant="destructive">
                          <StopCircle className="w-4 h-4 mr-2" />
                          Stop
                        </Button>
                      </div>
                    </div>
                  )}

                  {audioBlob && !isRecording && (
                    <div className="space-y-3">
                      <audio controls className="w-full">
                        <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                      </audio>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => setAudioBlob(null)} variant="outline">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Discard
                        </Button>
                        <Button onClick={startRecording} variant="outline">
                          <Mic className="w-4 h-4 mr-2" />
                          Re-record
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Text Content */}
            {noteData.note_type !== 'voice_memo' && (
              <Textarea
                placeholder="What's on your mind?"
                value={noteData.content}
                onChange={(e) => setNoteData({ ...noteData, content: e.target.value })}
                rows={6}
              />
            )}

            {/* Additional notes for voice memo */}
            {noteData.note_type === 'voice_memo' && (
              <Textarea
                placeholder="Additional notes (optional)"
                value={noteData.content}
                onChange={(e) => setNoteData({ ...noteData, content: e.target.value })}
                rows={3}
              />
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm">Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTag(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {noteData.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(idx)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNoteDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={noteData.note_type === 'voice_memo' ? saveVoiceMemo : saveTextNote}>
              <Plus className="w-4 h-4 mr-2" />
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}