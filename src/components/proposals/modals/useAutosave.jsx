import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Phase 2.3: Autosave Hook for Dynamic Modals
 * 
 * Provides automatic draft saving to localStorage with debouncing.
 * Allows users to recover unsaved work if they accidentally close the modal.
 * 
 * @param {string} modalId - Unique identifier for this modal instance
 * @param {object} formData - Current form data to save
 * @param {boolean} isOpen - Whether modal is currently open
 * @param {number} debounceMs - Milliseconds to wait before saving (default: 2000)
 */
export function useAutosave(modalId, formData, isOpen, debounceMs = 2000) {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef(null);
  const previousDataRef = useRef(null);

  // Generate storage key
  const getStorageKey = useCallback(() => {
    return `modal_draft_${modalId}`;
  }, [modalId]);

  // Check if draft exists
  const hasDraft = useCallback(() => {
    try {
      const key = getStorageKey();
      const draft = localStorage.getItem(key);
      return !!draft;
    } catch (error) {
      console.error('[useAutosave] Error checking draft:', error);
      return false;
    }
  }, [getStorageKey]);

  // Load draft from storage
  const loadDraft = useCallback(() => {
    try {
      const key = getStorageKey();
      const draft = localStorage.getItem(key);
      if (draft) {
        const parsed = JSON.parse(draft);
        console.log('[useAutosave] Draft loaded:', parsed);
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('[useAutosave] Error loading draft:', error);
      return null;
    }
  }, [getStorageKey]);

  // Save draft to storage
  const saveDraft = useCallback(() => {
    try {
      // Don't save if no data or data hasn't changed
      if (!formData || Object.keys(formData).length === 0) {
        return;
      }

      // Check if data actually changed
      if (JSON.stringify(formData) === JSON.stringify(previousDataRef.current)) {
        return;
      }

      setIsSaving(true);
      const key = getStorageKey();
      const draft = {
        data: formData,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(key, JSON.stringify(draft));
      previousDataRef.current = formData;
      setLastSaved(new Date());
      console.log('[useAutosave] Draft saved');
      
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('[useAutosave] Error saving draft:', error);
      setIsSaving(false);
    }
  }, [formData, getStorageKey]);

  // Clear draft from storage
  const clearDraft = useCallback(() => {
    try {
      const key = getStorageKey();
      localStorage.removeItem(key);
      setLastSaved(null);
      previousDataRef.current = null;
      console.log('[useAutosave] Draft cleared');
    } catch (error) {
      console.error('[useAutosave] Error clearing draft:', error);
    }
  }, [getStorageKey]);

  // Debounced autosave
  useEffect(() => {
    if (!isOpen || !modalId) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, isOpen, modalId, debounceMs, saveDraft]);

  return {
    hasDraft,
    loadDraft,
    saveDraft: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      saveDraft();
    },
    clearDraft,
    lastSaved,
    isSaving
  };
}