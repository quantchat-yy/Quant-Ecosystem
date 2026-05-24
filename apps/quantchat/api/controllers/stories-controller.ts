// ============================================================================
// QuantChat API - Stories Controller
// Story creation, viewing, replies, highlights, close friends
// ============================================================================

import type { Request, Response } from '../middleware';
import { storyService } from '../services/story-service';
import type { CreateStoryRequest } from '../../src/types';

export class StoriesController {
  async createStory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as CreateStoryRequest;

    if (!body.type || !body.mediaUrl || !body.privacy) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Type, media URL, and privacy are required', statusCode: 400 } });
      return;
    }

    const story = await storyService.createStory(userId, body);
    res.status(201).json({ success: true, data: story });
  }

  async getStory(req: Request, res: Response): Promise<void> {
    const storyId = req.params['storyId'];
    const story = await storyService.getStory(storyId);

    if (!story) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: story });
  }

  async getUserStories(req: Request, res: Response): Promise<void> {
    const targetUserId = req.params['userId'];
    const viewerId = req.userId;
    const stories = await storyService.getUserStories(targetUserId, viewerId);
    res.status(200).json({ success: true, data: stories });
  }

  async getMyStories(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const stories = await storyService.getUserStories(userId, userId);
    res.status(200).json({ success: true, data: stories });
  }

  async getFeed(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { friendIds?: string[] };
    const friendIds = body.friendIds || [];
    const feed = await storyService.getFeedStories(userId, friendIds);

    const feedArray: Array<{ userId: string; stories: unknown[] }> = [];
    for (const [uid, stories] of feed) {
      feedArray.push({ userId: uid, stories });
    }

    res.status(200).json({ success: true, data: feedArray });
  }

  async viewStory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const storyId = req.params['storyId'];

    const story = await storyService.viewStory(storyId, userId);
    if (!story) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found or not accessible', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: story });
  }

  async replyToStory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const storyId = req.params['storyId'];
    const body = req.body as { content: string; type?: 'text' | 'emoji' | 'snap' };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Reply content is required', statusCode: 400 } });
      return;
    }

    const reply = await storyService.replyToStory(storyId, userId, body.content, body.type);
    if (!reply) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } });
      return;
    }

    res.status(201).json({ success: true, data: reply });
  }

  async reportScreenshot(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const storyId = req.params['storyId'];
    await storyService.reportScreenshot(storyId, userId);
    res.status(200).json({ success: true, data: { message: 'Screenshot reported' } });
  }

  async deleteStory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const storyId = req.params['storyId'];
    const deleted = await storyService.deleteStory(storyId, userId);

    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found or unauthorized', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Story deleted' } });
  }

  // --------------------------------------------------------------------------
  // Highlights
  // --------------------------------------------------------------------------

  async createHighlight(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { title: string; storyIds: string[]; coverUrl?: string };

    if (!body.title || !body.storyIds || body.storyIds.length === 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Title and story IDs are required', statusCode: 400 } });
      return;
    }

    const highlight = await storyService.createHighlight(userId, body.title, body.storyIds, body.coverUrl);
    res.status(201).json({ success: true, data: highlight });
  }

  async addToHighlight(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const highlightId = req.params['highlightId'];
    const body = req.body as { storyId: string };

    const added = await storyService.addToHighlight(highlightId, body.storyId, userId);
    if (!added) {
      res.status(400).json({ success: false, error: { code: 'ADD_FAILED', message: 'Failed to add to highlight', statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Added to highlight' } });
  }

  async getHighlights(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'] || req.userId!;
    const highlights = storyService.getUserHighlights(userId);
    res.status(200).json({ success: true, data: highlights });
  }

  async deleteHighlight(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const highlightId = req.params['highlightId'];
    const deleted = await storyService.deleteHighlight(highlightId, userId);

    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Highlight not found or unauthorized', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Highlight deleted' } });
  }

  // --------------------------------------------------------------------------
  // Close Friends
  // --------------------------------------------------------------------------

  async getCloseFriends(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const friends = await storyService.getCloseFriends(userId);
    res.status(200).json({ success: true, data: friends });
  }

  async setCloseFriends(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { friendIds: string[] };

    if (!body.friendIds || !Array.isArray(body.friendIds)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Friend IDs array is required', statusCode: 400 } });
      return;
    }

    const list = await storyService.setCloseFriends(userId, body.friendIds);
    res.status(200).json({ success: true, data: list });
  }

  async addCloseFriend(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const friendId = req.params['friendId'];
    await storyService.addCloseFriend(userId, friendId);
    res.status(200).json({ success: true, data: { message: 'Friend added to close friends' } });
  }

  async removeCloseFriend(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const friendId = req.params['friendId'];
    await storyService.removeCloseFriend(userId, friendId);
    res.status(200).json({ success: true, data: { message: 'Friend removed from close friends' } });
  }
}

export const storiesController = new StoriesController();
