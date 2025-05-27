import { useForm, Controller } from 'react-hook-form';
import { Role } from '@prisma/client';
import { Button, Input, Select, FileUpload } from '@/components/ui';
import { CreateUserDto, UpdateUserDto, User } from '@/lib/api/users';

interface Props {
  initialData?: Partial<User>;
  onSubmit: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  isEditing?: boolean;
  isLoading?: boolean;
}

export function UserForm({ initialData, onSubmit, isEditing, isLoading }: Props) {
  const { control, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || Role.USER,
      profilePicture: initialData?.profilePicture || '',
      phoneNumber: initialData?.phoneNumber || ''
    }
  });

  const watchPassword = watch('password');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <Controller
          name="name"
          control={control}
          rules={{ required: 'Name is required' }}
          render={({ field }) => (
            <Input
              {...field}
              label="Name"
              error={errors.name?.message}
            />
          )}
        />

        {/* Email */}
        <Controller
          name="email"
          control={control}
          rules={{ 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          }}
          render={({ field }) => (
            <Input
              {...field}
              type="email"
              label="Email"
              error={errors.email?.message}
            />
          )}
        />

        {/* Password */}
        <Controller
          name="password"
          control={control}
          rules={{ 
            required: isEditing ? false : 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters'
            }
          }}
          render={({ field }) => (
            <Input
              {...field}
              type="password"
              label={isEditing ? 'New Password (leave empty to keep current)' : 'Password'}
              error={errors.password?.message}
            />
          )}
        />

        {/* Role */}
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Role"
              options={Object.values(Role).map(role => ({
                value: role,
                label: role.toLowerCase()
              }))}
            />
          )}
        />

        {/* Phone Number */}
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Phone Number"
              error={errors.phoneNumber?.message}
            />
          )}
        />
      </div>

      {/* Profile Picture */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Picture
        </label>
        <Controller
          name="profilePicture"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <FileUpload
                prefix="profiles/"
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB
                onUploadComplete={(file) => {
                  field.onChange(file.url);
                }}
              />
              {field.value && (
                <div className="mt-2">
                  <img
                    src={field.value}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={isLoading}>
          {isEditing ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
} 