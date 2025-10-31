import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@antml/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  MicOff,
  Play,
  Pause,
  Trash2,
  Pin,
  Search,
  FileText,
  Users,
  CheckSquare,
  Tag,
  Clock,
  Download,
  Copy,
  Edit,
  Star,
  Volume2,
  Loader2,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const NOTE_TYPES = [
  { value: 'quick_note', label: 'Quick Note', icon: StickyNote, color: 'yellow' },
  { value: 'voice_memo', label: 'Voice Memo', icon: Mic, color: 'blue' },
  { value: 'meeting_notes', label: 'Meeting Notes', icon: Users, color: 'green' },
  { value: 'action_item', label: 'Action Item', icon: CheckSquare, color: 'red' },
  { value: 'idea', label: 'Idea', icon: Zap, color: 'purple' }
];

export default function QuickNotesSystem({ user, organization, contextItem, contextType }) {
  const queryClient = useQueryClient();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const [formData, setFormData] = useState({
    note_type: 'quick_note',
    title: "",
    content: "",
    tags: [],
    is_pinned: false,
    related_to_type: contextType || null, // 'proposal', 'client', 'task'
    related_to_id: contextItem?.id || null,
    audio_url: null,
    transcription: null
  });

  // Store notes in user's custom data
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

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      toast.success("Recording stopped");
    }
  };

  // Transcribe audio using AI
  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    try {
      // Upload audio file
      const formDataUpload = new FormData();
      formDataUpload.append('file', audioBlob, 'voice_memo.wav');
      
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: audioBlob
      });

      // Use AI to transcribe (simulated - would need speech-to-text integration)
      // For now, we'll just save the audio URL
      setFormData({
        ...formData,
        audio_url: file_url,
        transcription: "Audio transcription would appear here. Integration with speech-to-text API needed."
      });

      toast.success("Audio saved (transcription requires speech-to-text integration)");
    } catch (error) {
      console.error("Error transcribing audio:", error);
      toast.error("Error processing audio");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCreateNote = () => {
    if (!formData.content && !formData.audio_url) {
      toast.error("Please add note content or record audio");
      return;
    }

    const newNote = {
      id: Date.now().toString(),
      ...formData,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    if (editingNote) {
      const updated = notes.map(n => 
        n.id === editingNote.id ? { ...newNote, id: editingNote.id } : n
      );
      saveNotesMutation.mutate(updated);
    } else {
      saveNotesMutation.mutate([...notes, newNote]);
    }

    setShowNoteDialog(false);
    resetForm();
  };

  const handleDeleteNote = (noteId) => {
    if (confirm("Delete this note?")) {
      const updated = notes.filter(n => n.id !== noteId);
      saveNotesMutation.mutate(updated);
    }
  };

  const handleTogglePin = (noteId) => {
    const updated = notes.map(n => 
      n.id === noteId ? { ...n, is_pinned: !n.is_pinned } : n
    );
    saveNotesMutation.mutate(updated);
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      note_type: note.note_type,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      is_pinned: note.is_pinned || false,
      related_to_type: note.related_to_type,
      related_to_id: note.related_to_id,
      audio_url: note.audio_url,
      transcription: note.transcription
    });
    setShowNoteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      note_type: 'quick_note',
      title: "",
      content: "",
      tags: [],
      is_pinned: false,
      related_to_type: contextType || null,
      related_to_id: contextItem?.id || null,
      audio_url: null,
      transcription: null
    });
    setEditingNote(null);
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === "all" || note.note_type === filterType;
    
    const matchesContext = !contextItem || 
      (note.related_to_type === contextType && note.related_to_id === contextItem.id);
    
    return matchesSearch && matchesType && matchesContext;
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const otherNotes = filteredNotes.filter(n => !n.is_pinned);

  const stats = {
    total: notes.length,
    pinned: notes.filter(n => n.is_pinned).length,
    voiceMemos: notes.filter(n => n.note_type === 'voice_memo').length,
    actionItems: notes.filter(n => n.note_type === 'action_item').length
  };

  // Auto-transcribe when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      transcribeAudio();
    }
  }, [audioBlob, isRecording]);

  const selectedType = NOTE_TYPES.find(t => t.value === formData.note_type);
  const TypeIcon = selectedType?.icon || StickyNote;

  return (
    <div className="space-y-6">
      {/* Floating Quick Note Button */}
      {!contextItem && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setShowNoteDialog(true)}
            className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
            size="icon"
          >
            <StickyNote className="w-6 h-6 text-white" />
          </Button>
        </div>
      )}

      {/* Header */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="w-6 h-6 text-yellow-600" />
                Quick Notes & Voice Memos
              </CardTitle>
              <CardDescription>
                Capture thoughts instantly - text or voice
              </CardDescription>
            </div>
            <Button onClick={() => setShowNoteDialog(true)} className="bg-yellow-600 hover:bg-yellow-700">
              <StickyNote className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-600">Total Notes</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Pin className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.pinned}</p>
            <p className="text-sm text-slate-600">Pinned</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Mic className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.voiceMemos}</p>
            <p className="text-sm text-slate-600">Voice Memos</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.actionItems}</p>
            <p className="text-sm text-slate-600">Action Items</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
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
        <Card className="border-none shadow-lg border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pin className="w-5 h-5 text-yellow-600" />
              Pinned Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {pinnedNotes.map(note => {
                const noteType = NOTE_TYPES.find(t => t.value === note.note_type);
                const Icon = noteType?.icon || StickyNote;
                const colorClasses = {
                  yellow: 'bg-yellow-100 border-yellow-300',
                  blue: 'bg-blue-100 border-blue-300',
                  green: 'bg-green-100 border-green-300',
                  red: 'bg-red-100 border-red-300',
                  purple: 'bg-purple-100 border-purple-300'
                };

                return (
                  <Card key={note.id} className={cn("border-2", colorClasses[noteType?.color])}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Icon className="w-4 h-4 text-slate-600" />
                          <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                            {note.title || "Untitled Note"}
                          </h4>
                        </div>
                        <Pin className="w-4 h-4 text-yellow-600 fill-yellow-600 flex-shrink-0" />
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-3 mb-2">{note.content}</p>
                      {note.audio_url && (
                        <Badge variant="outline" className="text-xs mb-2">
                          <Volume2 className="w-3 h-3 mr-1" />
                          Voice Memo
                        </Badge>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {moment(note.created_date).fromNow()}
                        </span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(note.content)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEdit(note)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Notes */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>All Notes ({filteredNotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <StickyNote className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium mb-2">No notes yet</p>
              <p className="text-sm mb-4">Capture your first thought</p>
              <Button onClick={() => setShowNoteDialog(true)}>
                <StickyNote className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {otherNotes.map(note => {
                const noteType = NOTE_TYPES.find(t => t.value === note.note_type);
                const Icon = noteType?.icon || StickyNote;

                return (
                  <Card key={note.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 mb-1">
                              {note.title || "Untitled Note"}
                            </h4>
                            <p className="text-sm text-slate-700 mb-2 line-clamp-2">{note.content}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">{noteType?.label}</Badge>
                              {note.audio_url && (
                                <Badge variant="outline" className="text-xs">
                                  <Volume2 className="w-3 h-3 mr-1" />
                                  Audio
                                </Badge>
                              )}
                              {note.tags?.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <Tag className="w-2 h-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              <span className="text-xs text-slate-500">
                                {moment(note.created_date).fromNow()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-3">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleTogglePin(note.id)}
                          >
                            <Pin className={cn("w-4 h-4", note.is_pinned && "text-yellow-600 fill-yellow-600")} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => copyToClipboard(note.content)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(note)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon className="w-5 h-5" />
              {editingNote ? "Edit" : "Quick"} Note
            </DialogTitle>
            <DialogDescription>
              Capture thoughts instantly - type or record
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Note Type */}
            <div className="space-y-2">
              <Label>Note Type</Label>
              <div className="flex gap-2 flex-wrap">
                {NOTE_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.value}
                      variant={formData.note_type === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, note_type: type.value })}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title (Optional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Client call notes, Follow-up idea..."
              />
            </div>

            {/* Voice Recording */}
            {formData.note_type === 'voice_memo' && (
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Label>Voice Recording</Label>
                  {isRecording && (
                    <Badge className="bg-red-600 animate-pulse">
                      <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                      Recording {formatDuration(recordingDuration)}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isRecording ? (
                    <Button onClick={startRecording} className="flex-1">
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="flex-1">
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                </div>
                {isTranscribing && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-purple-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing audio...
                  </div>
                )}
                {audioBlob && !isTranscribing && (
                  <div className="mt-3 p-2 bg-white rounded border text-sm">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-purple-600" />
                      <span className="text-slate-700">Audio recorded ({formatDuration(recordingDuration)})</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                placeholder="Type your note here..."
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                })}
                placeholder="e.g., important, follow-up, idea"
              />
            </div>

            {/* Pin */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-yellow-600" />
                <Label>Pin to top</Label>
              </div>
              <Switch 
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNoteDialog(false);
              resetForm();
              if (isRecording) stopRecording();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateNote}>
              {editingNote ? "Update" : "Save"} Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}