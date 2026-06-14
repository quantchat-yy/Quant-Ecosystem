'use client';

import { Card, Button } from '@quant/shared-ui';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';

type Role = 'Admin' | 'Moderator' | 'User';
type Status = 'active' | 'suspended' | 'banned';
type SortDir = 'asc' | 'desc' | null;

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
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
  {
    id: '6',
    name: 'Fiona Davis',
    email: 'fiona@quant.dev',
    role: 'Moderator',
    status: 'active',
    joinedAt: '2023-10-02',
    avatarInitials: 'FD',
  },
  {
    id: '7',
    name: 'George Kim',
    email: 'george@example.com',
    role: 'User',
    status: 'banned',
    joinedAt: '2023-10-20',
    avatarInitials: 'GK',
  },
  {
    id: '8',
    name: 'Hannah Lee',
    email: 'hannah@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2023-11-05',
    avatarInitials: 'HL',
  },
  {
    id: '9',
    name: 'Ivan Petrov',
    email: 'ivan@quant.dev',
    role: 'Admin',
    status: 'active',
    joinedAt: '2023-11-18',
    avatarInitials: 'IP',
  },
  {
    id: '10',
    name: 'Julia Martinez',
    email: 'julia@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2023-12-01',
    avatarInitials: 'JM',
  },
  {
    id: '11',
    name: 'Kevin Wu',
    email: 'kevin@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2024-01-10',
    avatarInitials: 'KW',
  },
  {
    id: '12',
    name: 'Laura Chen',
    email: 'laura@quant.dev',
    role: 'Moderator',
    status: 'active',
    joinedAt: '2024-01-22',
    avatarInitials: 'LC',
  },
];

const roleColors: Record<Role, string> = {
  Admin: 'bg-purple-100 text-purple-700',
  Moderator: 'bg-blue-100 text-blue-700',
  User: 'bg-gray-100 text-gray-700',
};

const statusColors: Record<Status, string> = {
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

function mapRole(role: string): Role {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'MODERATOR') return 'Moderator';
  return 'User';
}

function mapStatus(status: string): Status {
  if (status === 'SUSPENDED') return 'suspended';
  if (status === 'BANNED') return 'banned';
  return 'active';
}

function SortIndicator({ direction }: { direction: SortDir }) {
  if (!direction) return <span className="ml-1 opacity-40">&#8597;</span>;
  return <span className="ml-1">{direction === 'asc' ? '\u2191' : '\u2193'}</span>;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [usersData, setUsersData] = useState<UserRecord[]>(defaultUsersData);
  const [totalUsers, setTotalUsers] = useState(defaultUsersData.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users?page=${currentPage}&pageSize=${pageSize}`);
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
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [currentPage, pageSize]);

  const filteredUsers = useMemo(() => {
    let result = usersData;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter);
    }
    return result;
  }, [usersData, debouncedSearch, roleFilter, statusFilter]);

  const sortedUsers = useMemo(() => {
    if (!sortKey || !sortDir) return filteredUsers;
    return [...filteredUsers].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, {
        numeric: true,
      });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredUsers, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === sortedUsers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedUsers.map((u) => u.id)));
    }
  }, [sortedUsers, selected.size]);

  const handleBulkAction = useCallback(
    (action: string) => {
      const ids = Array.from(selected);
      if (action === 'suspend') {
        setUsersData((prev) =>
          prev.map((u) => (ids.includes(u.id) ? { ...u, status: 'suspended' as Status } : u)),
        );
      } else if (action === 'activate') {
        setUsersData((prev) =>
          prev.map((u) => (ids.includes(u.id) ? { ...u, status: 'active' as Status } : u)),
        );
      } else if (action === 'delete') {
        setUsersData((prev) => prev.filter((u) => !ids.includes(u.id)));
      }
      setSelected(new Set());
    },
    [selected],
  );

  const handleRoleChange = useCallback((userId: string, newRole: Role) => {
    setUsersData((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--quant-muted-foreground)]">Loading users...</p>
      </div>
    );
  }

  const columns = [
    { key: 'name', label: 'User', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'joinedAt', label: 'Joined', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-2">
          <span className="text-yellow-500 text-sm font-medium">&#9888;</span>
          <p className="text-sm text-yellow-600">
            Could not refresh data: {error}. Showing cached data.
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
          className="flex-1 min-w-[200px] min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          aria-label="Search users by name or email"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          aria-label="Filter by role"
        >
          <option value="all">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Moderator">Moderator</option>
          <option value="User">User</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', ...spring.snappy }}
          >
            <Card>
              <div className="flex items-center gap-3 p-3 flex-wrap">
                <span className="text-sm font-medium text-[var(--quant-foreground)]">
                  {selected.size} selected
                </span>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => handleBulkAction('suspend')}>Suspend</Button>
                  <Button onClick={() => handleBulkAction('activate')}>Activate</Button>
                  <Button onClick={() => handleBulkAction('delete')}>Delete</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--quant-border)]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === sortedUsers.length && sortedUsers.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-[var(--quant-border)]"
                    aria-label="Select all users"
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)] ${
                      col.sortable
                        ? 'cursor-pointer select-none hover:text-[var(--quant-foreground)]'
                        : ''
                    }`}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {col.sortable && (
                        <SortIndicator direction={sortKey === col.key ? sortDir : null} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--quant-border)] last:border-0 hover:bg-[var(--quant-muted)]/30"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="h-4 w-4 rounded border-[var(--quant-border)]"
                      aria-label={`Select ${user.name}`}
                    />
                  </td>
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
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer ${roleColors[user.role]}`}
                      aria-label={`Change role for ${user.name}`}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Moderator">Moderator</option>
                      <option value="User">User</option>
                    </select>
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
              {sortedUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--quant-muted-foreground)]"
                  >
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[var(--quant-border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--quant-muted-foreground)]">
              Page {currentPage} of {totalPages}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded border border-[var(--quant-border)] bg-[var(--quant-background)] px-2 py-1 text-xs text-[var(--quant-foreground)]"
              aria-label="Page size"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
