import { useState } from 'react';
import { Role } from '@prisma/client';
import { User } from '@/lib/api/users';
import { Avatar, Button, Input, Select, Table } from '@/components/ui';
import { formatDistance } from 'date-fns';

interface Props {
  users: User[];
  total: number;
  onDelete: (id: string) => Promise<void>;
  onEdit: (user: User) => void;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onRoleFilter: (role: Role | '') => void;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
}

export function UserList({
  users,
  total,
  onDelete,
  onEdit,
  onPageChange,
  onSearch,
  onRoleFilter,
  currentPage,
  pageSize,
  isLoading
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleRoleFilter = (value: Role | '') => {
    setSelectedRole(value);
    onRoleFilter(value);
  };

  const columns = [
    {
      header: 'User',
      cell: (row: User) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={row.profilePicture}
            alt={row.name || ''}
            fallback={row.name?.[0] || row.email[0]}
          />
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      cell: (row: User) => (
        <span className="capitalize">{row.role.toLowerCase()}</span>
      )
    },
    {
      header: 'Phone',
      cell: (row: User) => row.phoneNumber || '-'
    },
    {
      header: 'Created',
      cell: (row: User) => (
        formatDistance(new Date(row.createdAt), new Date(), { addSuffix: true })
      )
    },
    {
      header: 'Actions',
      cell: (row: User) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(row)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            color="red"
            onClick={() => onDelete(row.id)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={selectedRole}
          onChange={(value) => handleRoleFilter(value as Role | '')}
          options={[
            { value: '', label: 'All Roles' },
            ...Object.values(Role).map(role => ({
              value: role,
              label: role.toLowerCase()
            }))
          ]}
          className="max-w-xs"
        />
      </div>

      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        pagination={{
          currentPage,
          pageSize,
          total,
          onPageChange
        }}
      />
    </div>
  );
} 