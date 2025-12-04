import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Key,
  StickyNote,
  CheckSquare,
  Shield,
  Receipt,
  Plus,
  TrendingUp,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const quickActions = [
  {
    name: 'Add Password',
    icon: Key,
    href: '/passwords?action=new',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    name: 'New Note',
    icon: StickyNote,
    href: '/notes?action=new',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    name: 'Add Task',
    icon: CheckSquare,
    href: '/todos?action=new',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    name: 'Add Expense',
    icon: Receipt,
    href: '/expenses?action=new',
    color: 'bg-orange-500/10 text-orange-600',
  },
];

const stats = [
  { label: 'Passwords', value: '0', icon: Key, href: '/passwords' },
  { label: 'Notes', value: '0', icon: StickyNote, href: '/notes' },
  { label: 'Tasks', value: '0', icon: CheckSquare, href: '/todos' },
  { label: 'Vault Items', value: '0', icon: Shield, href: '/vault' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.email?.split('@')[0] || 'User';

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 md:space-y-8"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Good {getGreeting()}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your secure vault is ready. What would you like to do?
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 sm:px-4 sm:py-2 self-start">
          <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
          <span className="text-xs sm:text-sm font-medium text-green-600">Vault Unlocked</span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="premium-card group flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 text-center hover:border-accent/50"
            >
              <div
                className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${action.color} transition-transform group-hover:scale-110`}
              >
                <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">{action.name}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item}>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-foreground">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.href}
              className="premium-card group p-4 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-semibold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Security Status */}
      <motion.div variants={item} className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="premium-card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-medium text-foreground">Security Status</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">All systems operational</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Encryption</span>
              <span className="font-medium text-green-600">AES-256-GCM</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Key Derivation</span>
              <span className="font-medium text-green-600">PBKDF2 (200k)</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Vault Status</span>
              <span className="font-medium text-green-600">Unlocked</span>
            </div>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-accent/10">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-medium text-foreground">Getting Started</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Complete your setup</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
            <Link
              to="/passwords"
              className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 sm:p-3 text-xs sm:text-sm transition-colors hover:bg-secondary/50"
            >
              <span className="text-muted-foreground">Add your first password</span>
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
            </Link>
            <Link
              to="/vault"
              className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 sm:p-3 text-xs sm:text-sm transition-colors hover:bg-secondary/50"
            >
              <span className="text-muted-foreground">Store a card or document</span>
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}