import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { usePlannedWorkoutActions } from '../hooks/usePlannedWorkoutActions';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import type { CalendarSport } from '../types';

type ReferenceItem = {
  id: string;
  label: string;
  value: string;
};

type TemplateWorkout = {
  id: string;
  sport: CalendarSport;
  title: string;
  notes: string;
  easyMinutes: number;
  hardMinutes: number;
};

type UploadItem = {
  id: string;
  name: string;
  dataUrl: string;
};

type CustomSection = {
  id: string;
  title: string;
  items: ReferenceItem[];
};

const SPORTS: CalendarSport[] = ['Swim', 'Bike', 'Run', 'Lift', 'Other'];

const createId = () => Math.random().toString(36).slice(2, 10);

export default function References() {
  const { user } = useAuth();
  const { addPlannedWorkout } = usePlannedWorkoutActions();
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const [planDate, setPlanDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [templates, setTemplates] = useState<TemplateWorkout[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [editingTemplate, setEditingTemplate] = useState<Omit<
    TemplateWorkout,
    'id'
  > | null>(null);

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const [newTemplate, setNewTemplate] = useState<Omit<TemplateWorkout, 'id'>>({
    sport: 'Swim',
    title: '',
    notes: '',
    easyMinutes: 30,
    hardMinutes: 0,
  });

  const docRef = useMemo(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid, 'references', 'config');
  }, [user]);

  useEffect(() => {
    if (!docRef) return;
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const data = snap.data() as {
        metrics?: ReferenceItem[];
        dosages?: ReferenceItem[];
        phases?: ReferenceItem[];
        customSections?: CustomSection[];
      };
      const legacySections: CustomSection[] = [];
      if (data.metrics && data.metrics.length > 0) {
        legacySections.push({
          id: createId(),
          title: 'Metrics',
          items: data.metrics,
        });
      }
      if (data.dosages && data.dosages.length > 0) {
        legacySections.push({
          id: createId(),
          title: 'Dosages',
          items: data.dosages,
        });
      }
      if (data.phases && data.phases.length > 0) {
        legacySections.push({
          id: createId(),
          title: 'Training Phases',
          items: data.phases,
        });
      }
      if ((data.customSections?.length ?? 0) > 0) {
        setCustomSections(data.customSections ?? []);
      } else if (legacySections.length > 0) {
        setCustomSections(legacySections);
      } else {
        setCustomSections([]);
      }
      setLoading(false);
      loadedRef.current = true;
    });

    return unsubscribe;
  }, [docRef]);

  useEffect(() => {
    if (!user) return;
    const uploadsRef = collection(db, 'users', user.uid, 'referenceUploads');
    const unsubscribe = onSnapshot(uploadsRef, (snap) => {
      const data = snap.docs.map((docSnap) => {
        const payload = docSnap.data() as { name?: string; dataUrl?: string };
        return {
          id: docSnap.id,
          name: payload.name ?? 'Upload',
          dataUrl: payload.dataUrl ?? '',
        };
      });
      setUploads(data);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const templatesRef = collection(db, 'users', user.uid, 'referenceWorkouts');
    const unsubscribe = onSnapshot(templatesRef, (snap) => {
      const data = snap.docs.map((docSnap) => {
        const payload = docSnap.data() as Omit<TemplateWorkout, 'id'>;
        return {
          id: docSnap.id,
          sport: payload.sport,
          title: payload.title,
          notes: payload.notes,
          easyMinutes: payload.easyMinutes,
          hardMinutes: payload.hardMinutes,
        };
      });
      setTemplates(data);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!docRef || !loadedRef.current) return;
    const timeout = setTimeout(async () => {
      await setDoc(
        docRef,
        {
          customSections,
          metrics: [],
          dosages: [],
          phases: [],
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 1500);
    }, 800);
    return () => clearTimeout(timeout);
  }, [customSections, docRef]);

  const handleFiles = (files?: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const uploadsRef = collection(db, 'users', user.uid, 'referenceUploads');
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        await addDoc(uploadsRef, {
          name: file.name,
          dataUrl: result,
          createdAt: serverTimestamp(),
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveUpload = async (uploadId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'referenceUploads', uploadId));
  };

  const handleCopyTemplate = async (template: TemplateWorkout) => {
    await addPlannedWorkout({
      date: planDate,
      sport: template.sport,
      title: template.title,
      notes: template.notes,
      easyMinutes: template.easyMinutes,
      hardMinutes: template.hardMinutes,
    });
    setAddedIds((prev) => new Set(prev).add(template.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }, 1500);
  };

  const handleAddTemplate = async () => {
    if (!user || !newTemplate.title.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'referenceWorkouts'), {
      sport: newTemplate.sport,
      title: newTemplate.title.trim(),
      notes: newTemplate.notes,
      easyMinutes: newTemplate.easyMinutes,
      hardMinutes: newTemplate.hardMinutes,
      createdAt: serverTimestamp(),
    });
    setNewTemplate((prev) => ({
      ...prev,
      title: '',
      notes: '',
    }));
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!user) return;
    if (editingTemplateId === id) {
      setEditingTemplateId(null);
      setEditingTemplate(null);
    }
    await deleteDoc(doc(db, 'users', user.uid, 'referenceWorkouts', id));
  };

  const handleEditTemplate = (template: TemplateWorkout) => {
    setEditingTemplateId(template.id);
    setEditingTemplate({
      sport: template.sport,
      title: template.title,
      notes: template.notes,
      easyMinutes: template.easyMinutes,
      hardMinutes: template.hardMinutes,
    });
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditingTemplate(null);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingTemplateId || !editingTemplate) return;
    if (!editingTemplate.title.trim()) return;
    await updateDoc(
      doc(db, 'users', user.uid, 'referenceWorkouts', editingTemplateId),
      {
        sport: editingTemplate.sport,
        title: editingTemplate.title.trim(),
        notes: editingTemplate.notes,
        easyMinutes: editingTemplate.easyMinutes,
        hardMinutes: editingTemplate.hardMinutes,
        updatedAt: serverTimestamp(),
      },
    );
    setEditingTemplateId(null);
    setEditingTemplate(null);
  };

  const addCustomSection = () => {
    setCustomSections((prev) => [
      ...prev,
      { id: createId(), title: 'New Section', items: [] },
    ]);
  };

  const addPresetSection = (title: string) => {
    setCustomSections((prev) => [
      ...prev,
      { id: createId(), title, items: [] },
    ]);
  };

  const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setCustomSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    );
  };

  const removeCustomSection = (id: string) => {
    setCustomSections((prev) => prev.filter((section) => section.id !== id));
  };

  const addCustomSectionItem = (sectionId: string) => {
    setCustomSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                ...section.items,
                { id: createId(), label: '', value: '' },
              ],
            }
          : section,
      ),
    );
  };

  const updateCustomSectionItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<ReferenceItem>,
  ) => {
    setCustomSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            }
          : section,
      ),
    );
  };

  const removeCustomSectionItem = (sectionId: string, itemId: string) => {
    setCustomSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.filter((item) => item.id !== itemId),
            }
          : section,
      ),
    );
  };

  if (!user) {
    return <p className='muted'>Sign in to manage references.</p>;
  }

  return (
    <div className='dashboard'>
      <div className='page-header'>
        <h1>References</h1>
        {saveStatus && <span className='success-text'>{saveStatus}</span>}
      </div>

      <section className='ref-grid'>
        <div className='ref-card'>
          <h2>Uploads</h2>
          <label>
            Screenshots
            <input
              type='file'
              accept='image/*'
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          <div className='ref-upload-list'>
            {uploads.map((upload) => (
              <div key={upload.id} className='ref-upload-item'>
                <img src={upload.dataUrl} alt={upload.name} />
                <button
                  type='button'
                  className='filter-btn'
                  onClick={() => handleRemoveUpload(upload.id)}
                >
                  Remove
                </button>
              </div>
            ))}
            {uploads.length === 0 && (
              <p className='muted'>No screenshots uploaded yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className='ref-card'>
        <div className='ref-header'>
          <h2>Custom Sections</h2>
          <div className='ref-section-actions'>
            <button
              type='button'
              className='filter-btn'
              onClick={() => addPresetSection('Metrics')}
            >
              Add Metrics
            </button>
            <button
              type='button'
              className='filter-btn'
              onClick={() => addPresetSection('Dosages')}
            >
              Add Dosages
            </button>
            <button
              type='button'
              className='filter-btn'
              onClick={() => addPresetSection('Training Phases')}
            >
              Add Phases
            </button>
            <button
              type='button'
              className='filter-btn'
              onClick={addCustomSection}
            >
              Add Section
            </button>
          </div>
        </div>
        {customSections.length === 0 && (
          <p className='muted'>Add any reference cards you want.</p>
        )}
        <div className='ref-custom-list'>
          {customSections.map((section) => (
            <div key={section.id} className='ref-subcard'>
              <div className='ref-header'>
                <input
                  className='ref-section-title'
                  value={section.title}
                  onChange={(e) =>
                    updateCustomSection(section.id, { title: e.target.value })
                  }
                />
                <div className='ref-section-actions'>
                  <button
                    type='button'
                    className='filter-btn'
                    onClick={() => addCustomSectionItem(section.id)}
                  >
                    Add Item
                  </button>
                  <button
                    type='button'
                    className='filter-btn'
                    onClick={() => removeCustomSection(section.id)}
                  >
                    Remove Section
                  </button>
                </div>
              </div>
              <div className='ref-list'>
                {section.items.map((item) => (
                  <div key={item.id} className='ref-item-row'>
                    <input
                      type='text'
                      placeholder='Label'
                      value={item.label}
                      onChange={(e) =>
                        updateCustomSectionItem(section.id, item.id, {
                          label: e.target.value,
                        })
                      }
                    />
                    <input
                      type='text'
                      placeholder='Value or notes'
                      value={item.value}
                      onChange={(e) =>
                        updateCustomSectionItem(section.id, item.id, {
                          value: e.target.value,
                        })
                      }
                    />
                    <button
                      type='button'
                      className='filter-btn'
                      onClick={() =>
                        removeCustomSectionItem(section.id, item.id)
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {section.items.length === 0 && (
                  <p className='muted'>No items yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className='ref-card'>
        <div className='page-header'>
          <h2>Workout Library</h2>
          <label className='ref-date'>
            Plan Date
            <input
              type='date'
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
            />
          </label>
        </div>
        <div className='ref-library'>
          <div className='ref-template-form'>
            <label>
              Sport
              <select
                value={newTemplate.sport}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    sport: e.target.value as CalendarSport,
                  }))
                }
              >
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                type='text'
                value={newTemplate.title}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder='Workout name'
              />
            </label>
            <label>
              Notes
              <textarea
                className='modal-textarea'
                rows={3}
                value={newTemplate.notes}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder='Set details or instructions'
              />
            </label>
            <div className='pace-row'>
              <label>
                Easy Minutes
                <input
                  type='number'
                  min={0}
                  value={newTemplate.easyMinutes || ''}
                  placeholder='0'
                  onChange={(e) =>
                    setNewTemplate((prev) => ({
                      ...prev,
                      easyMinutes: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label>
                Hard Minutes
                <input
                  type='number'
                  min={0}
                  value={newTemplate.hardMinutes || ''}
                  placeholder='0'
                  onChange={(e) =>
                    setNewTemplate((prev) => ({
                      ...prev,
                      hardMinutes: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
            </div>
            <button
              type='button'
              className='filter-btn'
              onClick={handleAddTemplate}
            >
              Add to Library
            </button>
          </div>

          <div className='ref-templates'>
            {templates.map((template) => (
              <div key={template.id} className='ref-template-card'>
                {editingTemplateId === template.id && editingTemplate ? (
                  <>
                    <label>
                      Sport
                      <select
                        value={editingTemplate.sport}
                        onChange={(e) =>
                          setEditingTemplate((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  sport: e.target.value as CalendarSport,
                                }
                              : prev,
                          )
                        }
                      >
                        {SPORTS.map((sport) => (
                          <option key={sport} value={sport}>
                            {sport}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Title
                      <input
                        type='text'
                        value={editingTemplate.title}
                        onChange={(e) =>
                          setEditingTemplate((prev) =>
                            prev ? { ...prev, title: e.target.value } : prev,
                          )
                        }
                      />
                    </label>
                    <label>
                      Notes
                      <textarea
                        className='modal-textarea'
                        rows={3}
                        value={editingTemplate.notes}
                        onChange={(e) =>
                          setEditingTemplate((prev) =>
                            prev ? { ...prev, notes: e.target.value } : prev,
                          )
                        }
                      />
                    </label>
                    <div className='pace-row'>
                      <label>
                        Easy Minutes
                        <input
                          type='number'
                          min={0}
                          value={editingTemplate.easyMinutes || ''}
                          placeholder='0'
                          onChange={(e) =>
                            setEditingTemplate((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    easyMinutes: Number(e.target.value) || 0,
                                  }
                                : prev,
                            )
                          }
                        />
                      </label>
                      <label>
                        Hard Minutes
                        <input
                          type='number'
                          min={0}
                          value={editingTemplate.hardMinutes || ''}
                          placeholder='0'
                          onChange={(e) =>
                            setEditingTemplate((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    hardMinutes: Number(e.target.value) || 0,
                                  }
                                : prev,
                            )
                          }
                        />
                      </label>
                    </div>
                    <div className='ref-template-actions'>
                      <button
                        type='button'
                        className='filter-btn'
                        onClick={handleSaveEdit}
                      >
                        Save
                      </button>
                      <button
                        type='button'
                        className='filter-btn'
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type='button'
                        className='filter-btn'
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <strong>{template.title}</strong>
                      <div className='muted'>
                        {template.sport} ·{' '}
                        {template.easyMinutes + template.hardMinutes} min
                      </div>
                    </div>
                    <p className='ref-template-notes'>{template.notes}</p>
                    <div className='ref-template-actions'>
                      <button
                        type='button'
                        className={`filter-btn ${addedIds.has(template.id) ? 'filter-btn-success' : ''}`}
                        onClick={() => handleCopyTemplate(template)}
                      >
                        {addedIds.has(template.id)
                          ? 'Added!'
                          : 'Add to Calendar'}
                      </button>
                      <button
                        type='button'
                        className='filter-btn'
                        onClick={() => handleEditTemplate(template)}
                      >
                        Edit
                      </button>
                      <button
                        type='button'
                        className='filter-btn'
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {!loading && templates.length === 0 && (
              <p className='muted'>No saved workouts yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
