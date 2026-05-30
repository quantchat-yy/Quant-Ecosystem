'use client';

import { Card, Badge, Button } from '@quant/shared-ui';
import { useState, useEffect } from 'react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Moderator' | 'User';
  status: 'active' | 'suspended' | 'banned';
  joinedAt: string;
  avatarInitials: string;
}

const defaultUsersData: UserRecord[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@quant.dev',
    role: 'Admin',
    status: 'active',
    joinedAt: '2023-06-15',
    avatarInitials: 'AJ',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@quant.dev',
    role: 'Moderator',
    status: 'active',
    joinedAt: '2023-07-22',
    avatarInitials: 'BS',
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2023-08-10',
    avatarInitials: 'CB',
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: 'User',
    status: 'suspended',
    joinedAt: '2023-09-01',
    avatarInitials: 'DP',
  },
  {
    id: '5',
    name: 'Evan Harris',
    email: 'evan@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2023-09-15',
    avatarInitials: 'EH',
  },
];

const roleColors: Record<UserRecord['role'], string> = {
  Admin: 'bg-purple-100 text-purple-700',
  Moderator: 'bg-blue-100 text-blue-700',
  User: 'bg-gray-100 text-gray-700',
};

const statusColors: Record<UserRecord['status'], string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  banned: 'bg-red-100 text-red-700',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapRole(role: string): UserRecord['role'] {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'MODERATOR') return 'Moderator';
  return 'User';
}

function mapStatus(status: string): UserRecord['status'] {
  if (status === 'SUSPENDED') return 'suspended';
  if (status === 'BANNED') return 'banned';
  return 'active';
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [usersData, setUsersData] = useState<UserRecord[]>(defaultUsersData);
  const [totalUsers, setTotalUsers] = useState(defaultUsersData.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users?page=${currentPage}&pageSize=20`);
        const json = await res.json();
        if (json.success && json.data) {
          setUsersData(
            json.data.map(
              (u: {
                id: string;
                email: string;
                username?: string;
                displayName?: string;
                role: string;
                status: string;
                createdAt: string;
              }) => ({
                id: u.id,
                name: u.displayName || u.username || u.email.split('@')[0],
                email: u.email,
                role: mapRole(u.role),
                status: mapStatus(u.status),
                joinedAt: new Date(u.createdAt).toISOString().split('T')[0],
                avatarInitials: getInitials(u.displayName || u.username || u.email.split('@')[0]),
              }),
            ),
          );
          if (json.metadata) {
            setTotalUsers(json.metadata.total);
            setTotalPages(json.metadata.totalPages);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [currentPage]);

  const filteredUsers = usersData.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--quant-muted-foreground)]">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-2">
          <span className="text-yellow-500 text-sm font-medium">&#9888;</span>
          <p className="text-sm text-yellow-600">
            Could not refresh data: {error}. Showing cached data below.
          </p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Users Management</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Manage {totalUsers} registered users
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        >
          <option value="all">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Moderator">Moderator</option>
          <option value="User">User</option>
        </select>
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--quant-border)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Joined
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[var(--quant-border)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--quant-muted)] text-xs font-medium text-[var(--quant-foreground)]">
                        {user.avatarInitials}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--quant-foreground)]">{user.name}</p>
                        <p className="text-xs text-[var(--quant-muted-foreground)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role]}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[user.status]}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                    {user.joinedAt}
                  </td>
                  <td className="px-4 py-3">
                    <Button>Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[var(--quant-muted-foreground)]">
        <span>
          Showing {filteredUsers.length} of {totalUsers} users
        </span>
        <div className="flex gap-2">
          <Badge variant="default">
            Page {currentPage} of {totalPages}
          </Badge>
        </div>
      </div>
    </div>
  );
}
