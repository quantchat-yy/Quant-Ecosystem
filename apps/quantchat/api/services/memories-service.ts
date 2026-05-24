// ============================================================================
// QuantChat - Memories Service
// Save snaps, organization by date/location/people, search, auto-story, storage
// ============================================================================
interface Memory { id: string; userId: string; type: 'photo' | 'video' | 'story'; mediaUrl: string; thumbnailUrl: string; caption?: string; location?: { lat: number; lng: number; name: string }; people: string[]; tags: string[]; createdAt: Date; size: number; duration?: number; isStarred: boolean; isDeleted: boolean; }
interface MemoryStats { totalCount: number; photoCount: number; videoCount: number; storyCount: number; totalSize: number; oldestMemory?: Date; newestMemory?: Date; }

const memories = new Map<string, Memory>();
const generateId = (): string => `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class MemoriesService {
  static async saveMemory(userId: string, data: { type: string; mediaUrl: string; thumbnailUrl: string; caption?: string; location?: { lat: number; lng: number; name: string }; people?: string[]; tags?: string[]; size: number; duration?: number }): Promise<Memory> {
    const memory: Memory = { id: generateId(), userId, type: data.type as Memory['type'], mediaUrl: data.mediaUrl, thumbnailUrl: data.thumbnailUrl, caption: data.caption, location: data.location, people: data.people || [], tags: data.tags || [], createdAt: new Date(), size: data.size, duration: data.duration, isStarred: false, isDeleted: false };
    memories.set(memory.id, memory); return memory;
  }

  static async getMemories(userId: string, filters?: { type?: string; startDate?: Date; endDate?: Date; query?: string; starred?: boolean; page?: number; limit?: number }): Promise<{ memories: Memory[]; total: number }> {
    let result = Array.from(memories.values()).filter(m => m.userId === userId && !m.isDeleted);
    if (filters?.type) result = result.filter(m => m.type === filters.type);
    if (filters?.startDate) result = result.filter(m => m.createdAt >= filters.startDate!);
    if (filters?.endDate) result = result.filter(m => m.createdAt <= filters.endDate!);
    if (filters?.starred) result = result.filter(m => m.isStarred);
    if (filters?.query) { const q = filters.query.toLowerCase(); result = result.filter(m => (m.caption && m.caption.toLowerCase().includes(q)) || m.tags.some(t => t.toLowerCase().includes(q)) || (m.location && m.location.name.toLowerCase().includes(q)) || m.people.some(p => p.toLowerCase().includes(q))); }
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = result.length; const page = filters?.page || 1; const limit = filters?.limit || 50;
    return { memories: result.slice((page - 1) * limit, page * limit), total };
  }

  static async starMemory(userId: string, memoryId: string): Promise<void> { const m = memories.get(memoryId); if (m && m.userId === userId) m.isStarred = !m.isStarred; }
  static async deleteMemories(userId: string, ids: string[]): Promise<number> { let count = 0; ids.forEach(id => { const m = memories.get(id); if (m && m.userId === userId) { m.isDeleted = true; count++; } }); return count; }
  static async generateAutoStory(userId: string, date: string): Promise<Memory[]> { const d = new Date(date); const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return Array.from(memories.values()).filter(m => m.userId === userId && !m.isDeleted && m.createdAt >= dayStart && m.createdAt < dayEnd).slice(0, 10); }
  static async getStats(userId: string): Promise<MemoryStats> { const userMems = Array.from(memories.values()).filter(m => m.userId === userId && !m.isDeleted); return { totalCount: userMems.length, photoCount: userMems.filter(m => m.type === 'photo').length, videoCount: userMems.filter(m => m.type === 'video').length, storyCount: userMems.filter(m => m.type === 'story').length, totalSize: userMems.reduce((s, m) => s + m.size, 0), oldestMemory: userMems.length > 0 ? userMems[userMems.length - 1].createdAt : undefined, newestMemory: userMems.length > 0 ? userMems[0].createdAt : undefined }; }
  static async searchByLocation(userId: string, lat: number, lng: number, radiusKm: number): Promise<Memory[]> { return Array.from(memories.values()).filter(m => { if (m.userId !== userId || !m.location || m.isDeleted) return false; const dLat = (m.location.lat - lat) * 111; const dLng = (m.location.lng - lng) * 111 * Math.cos(lat * Math.PI / 180); return Math.sqrt(dLat * dLat + dLng * dLng) <= radiusKm; }); }
}

export default MemoriesService;
