/**
 * Lead Notes Service
 * 
 * Service for managing lead notes and activity history
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from './client';
import { COLLECTIONS, LeadNote } from './schemas';

export interface LeadNoteInsert extends Omit<LeadNote, '_id' | 'createdAt' | 'updatedAt'> {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LeadNoteUpdate extends Partial<Omit<LeadNote, '_id' | 'leadId' | 'createdAt'>> {
  updatedAt: Date;
}

export class LeadNotesService {
  /**
   * Create a new lead note
   */
  async create(noteData: LeadNoteInsert): Promise<LeadNote> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const now = new Date();
    const note: LeadNote = {
      ...noteData,
      createdAt: noteData.createdAt || now,
      updatedAt: noteData.updatedAt || now,
    };

    const result = await collection.insertOne(note as any);
    return {
      ...note,
      _id: result.insertedId.toString(),
    };
  }

  /**
   * Get all notes for a specific lead, sorted by creation date (newest first)
   */
  async getByLeadId(leadId: string): Promise<LeadNote[]> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const notes = await collection
      .find({ leadId })
      .sort({ createdAt: -1 })
      .toArray();

    return notes.map(note => ({
      ...note,
      _id: note._id?.toString(),
    }));
  }

  /**
   * Get a single note by ID
   */
  async getById(noteId: string): Promise<LeadNote | null> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const note = await collection.findOne({ _id: new ObjectId(noteId) as any });
    
    if (!note) return null;

    return {
      ...note,
      _id: note._id?.toString(),
    };
  }

  /**
   * Update a note
   */
  async update(noteId: string, updateData: LeadNoteUpdate): Promise<LeadNote | null> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const update = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(noteId) as any },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    return {
      ...result,
      _id: result._id?.toString(),
    };
  }

  /**
   * Delete a note
   */
  async delete(noteId: string): Promise<boolean> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const result = await collection.deleteOne({ _id: new ObjectId(noteId) as any });
    return result.deletedCount > 0;
  }

  /**
   * Get notes by author
   */
  async getByAuthorId(authorId: string): Promise<LeadNote[]> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const notes = await collection
      .find({ authorId })
      .sort({ createdAt: -1 })
      .toArray();

    return notes.map(note => ({
      ...note,
      _id: note._id?.toString(),
    }));
  }

  /**
   * Get notes by type
   */
  async getByType(noteType: LeadNote['noteType']): Promise<LeadNote[]> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const notes = await collection
      .find({ noteType })
      .sort({ createdAt: -1 })
      .toArray();

    return notes.map(note => ({
      ...note,
      _id: note._id?.toString(),
    }));
  }

  /**
   * Delete all notes for a lead (useful when deleting a lead)
   */
  async deleteByLeadId(leadId: string): Promise<number> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    const result = await collection.deleteMany({ leadId });
    return result.deletedCount;
  }

  /**
   * Get count of notes for a lead
   */
  async getCountByLeadId(leadId: string): Promise<number> {
    const db = getDatabase();
    const collection = db.collection<LeadNote>(COLLECTIONS.LEAD_NOTES);

    return await collection.countDocuments({ leadId });
  }
}

// Export singleton instance
export const leadNotesService = new LeadNotesService();

