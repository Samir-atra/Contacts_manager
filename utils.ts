export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const getRandomColor = (): string => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(timestamp));
};
