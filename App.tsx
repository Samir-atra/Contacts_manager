import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import Papa from 'papaparse';
import { 
  Search, 
  Plus, 
  Users, 
  Clock, 
  ArrowDownAZ, 
  Settings, 
  Phone, 
  Mail, 
  MoreVertical, 
  UserPlus,
  Briefcase,
  Menu,
  X,
  Check,
  Download,
  Upload
} from 'lucide-react';
import { Contact, Group, SortOption, ContactFormData } from './types';
import { generateId, getRandomColor, getInitials, formatDate } from './utils';
import { Modal } from './components/Modal';
import { ContactForm } from './components/ContactForm';
import { GroupManager } from './components/GroupManager';

// --- Local Storage Keys ---
const STORAGE_KEY_CONTACTS = 'nexus_contacts_v1';
const STORAGE_KEY_GROUPS = 'nexus_groups_v1';

const App = () => {
  // --- State ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.Alphabetical);
  
  // Modals
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Load data from local storage on mount
    const storedContacts = localStorage.getItem(STORAGE_KEY_CONTACTS);
    const storedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);

    if (storedContacts) {
      try {
        setContacts(JSON.parse(storedContacts));
      } catch (e) {
        console.error("Failed to parse contacts", e);
      }
    }
    if (storedGroups) {
      try {
        setGroups(JSON.parse(storedGroups));
      } catch (e) {
        console.error("Failed to parse groups", e);
      }
    } else {
        // Initial default groups
        const defaults = [
            { id: generateId(), name: 'Work', color: 'bg-blue-500' },
            { id: generateId(), name: 'Family', color: 'bg-green-500' },
            { id: generateId(), name: 'Friends', color: 'bg-purple-500' }
        ];
        setGroups(defaults);
        localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(defaults));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
  }, [groups]);

  // --- Handlers ---

  const handleAddContact = (data: ContactFormData) => {
    const newContact: Contact = {
      id: generateId(),
      ...data,
      createdAt: Date.now(),
      avatarColor: getRandomColor()
    };
    setContacts(prev => [...prev, newContact]);
    setIsContactModalOpen(false);
  };

  const handleUpdateContact = (data: ContactFormData) => {
    if (!editingContact) return;
    setContacts(prev => prev.map(c => 
      c.id === editingContact.id 
        ? { ...c, ...data } 
        : c
    ));
    setEditingContact(undefined);
    setIsContactModalOpen(false);
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setIsContactModalOpen(true);
  };

  const handleAddGroup = (group: Group) => {
    setGroups(prev => [...prev, group]);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Delete this group? Contacts in this group will be unassigned.')) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
      // Unassign contacts
      setContacts(prev => prev.map(c => 
        c.groupId === groupId ? { ...c, groupId: null } : c
      ));
      if (selectedGroupId === groupId) setSelectedGroupId(null);
    }
  };

  // --- CSV Import/Export ---

  const handleExportCSV = () => {
    const csvData = contacts.map(c => {
        const groupName = groups.find(g => g.id === c.groupId)?.name || '';
        return {
            'Prefix': c.prefix || '',
            'First Name': c.firstName,
            'Last Name': c.lastName,
            'Email': c.email,
            'Phone': c.phone,
            'Job Title': c.jobTitle || '',
            'Company': c.company || '',
            'Group': groupName
        };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `connect_hub_contacts_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
            const newContacts: Contact[] = [];
            const newGroups: Group[] = [];
            
            // Create a map of existing group names to IDs (lowercase for loose matching)
            const existingGroupsMap = new Map(groups.map(g => [g.name.toLowerCase(), g.id]));
            // Also track newly created groups in this session to avoid duplicates
            const newlyCreatedGroupsMap = new Map<string, string>(); // name -> id

            results.data.forEach((row: any) => {
                // Basic validation
                const firstName = row['First Name'] || row['firstname'] || row['First Name'] || '';
                const lastName = row['Last Name'] || row['lastname'] || row['Last Name'] || '';
                
                if (!firstName && !lastName) return;

                const groupNameRaw = row['Group'] || row['group'] || '';
                const groupNameLower = groupNameRaw.trim().toLowerCase();
                let groupId = null;

                if (groupNameLower) {
                    if (existingGroupsMap.has(groupNameLower)) {
                        groupId = existingGroupsMap.get(groupNameLower) || null;
                    } else if (newlyCreatedGroupsMap.has(groupNameLower)) {
                        groupId = newlyCreatedGroupsMap.get(groupNameLower) || null;
                    } else {
                        // Create new group
                        const newGroup: Group = {
                            id: generateId(),
                            name: groupNameRaw.trim(), // Use original casing
                            color: getRandomColor()
                        };
                        newGroups.push(newGroup);
                        newlyCreatedGroupsMap.set(groupNameLower, newGroup.id);
                        groupId = newGroup.id;
                    }
                }

                newContacts.push({
                    id: generateId(),
                    prefix: row['Prefix'] || row['prefix'] || '',
                    firstName: firstName,
                    lastName: lastName,
                    email: row['Email'] || row['email'] || '',
                    phone: row['Phone'] || row['phone'] || '',
                    jobTitle: row['Job Title'] || row['jobtitle'] || '',
                    company: row['Company'] || row['company'] || '',
                    groupId: groupId,
                    createdAt: Date.now(),
                    avatarColor: getRandomColor()
                });
            });

            if (newGroups.length > 0) {
                setGroups(prev => [...prev, ...newGroups]);
            }
            if (newContacts.length > 0) {
                setContacts(prev => [...prev, ...newContacts]);
                alert(`Successfully imported ${newContacts.length} contacts${newGroups.length > 0 ? ` and created ${newGroups.length} new groups` : ''}.`);
                setIsMobileMenuOpen(false);
            } else {
                alert('No valid contacts found in CSV. Please check the file format.');
            }
            
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
        error: (error: any) => {
            console.error("CSV Import Error:", error);
            alert("Failed to parse CSV file.");
        }
    });
  };

  // --- Derived State ---

  const filteredContacts = useMemo(() => {
    let result = contacts;

    // Filter by Group
    if (selectedGroupId) {
      result = result.filter(c => c.groupId === selectedGroupId);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.firstName.toLowerCase().includes(query) ||
        c.lastName.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case SortOption.Alphabetical:
          return (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName);
        case SortOption.TimeAdded: // Oldest first
          return a.createdAt - b.createdAt;
        case SortOption.Newest: // Newest first
          return b.createdAt - a.createdAt;
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, searchQuery, selectedGroupId, sortBy]);

  const getGroupName = (id: string | null) => {
    if (!id) return null;
    return groups.find(g => g.id === id)?.name;
  };

  const getGroupColor = (id: string | null) => {
    if (!id) return 'bg-gray-400';
    return groups.find(g => g.id === id)?.color || 'bg-gray-400';
  };

  // --- Render ---

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500">
              Connect Hub
            </h1>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            <div>
              <button 
                onClick={() => {
                    setEditingContact(undefined);
                    setIsContactModalOpen(true);
                    setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all font-medium"
              >
                <UserPlus size={20} />
                New Contact
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Filters</h3>
              <button
                onClick={() => { setSelectedGroupId(null); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedGroupId === null ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users size={18} />
                All Contacts
                <span className="ml-auto bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {contacts.length}
                </span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Groups</h3>
                <button 
                    onClick={() => setIsGroupModalOpen(true)}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                >
                    <Settings size={14} />
                </button>
              </div>
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => { setSelectedGroupId(group.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedGroupId === group.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${group.color}`} />
                  {group.name}
                  <span className="ml-auto bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {contacts.filter(c => c.groupId === group.id).length}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-t border-dashed border-gray-200 mt-2"
              >
                <Plus size={16} />
                Manage Groups
              </button>
            </div>

            {/* Data Management Section */}
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Data</h3>
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Download size={18} />
                Export CSV
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Upload size={18} />
                Import CSV
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportCSV} 
                accept=".csv" 
                className="hidden" 
              />
            </div>

          </div>
          
          <div className="p-4 border-t border-gray-100">
             <div className="text-xs text-gray-400 text-center">
                 v1.0.0 &bull; Connect Hub Contacts
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
             <button 
                className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(true)}
             >
                 <Menu size={24} />
             </button>
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-primary-500 rounded-lg outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
                <button 
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isSortDropdownOpen 
                            ? 'bg-primary-50 text-primary-700' 
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    {sortBy === SortOption.Alphabetical && <ArrowDownAZ size={18} />}
                    {sortBy === SortOption.Newest && <Clock size={18} />}
                    {sortBy === SortOption.TimeAdded && <Clock size={18} className="rotate-180" />}
                    <span className="hidden sm:inline">Sort</span>
                </button>
                
                {/* Backdrop to close dropdown when clicking outside */}
                {isSortDropdownOpen && (
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsSortDropdownOpen(false)} 
                    />
                )}

                {/* Dropdown for Sort */}
                {isSortDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <div className="px-3 py-2 border-b border-gray-50 mb-1">
                             <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort Order</span>
                        </div>
                        <button 
                            onClick={() => { setSortBy(SortOption.Alphabetical); setIsSortDropdownOpen(false); }} 
                            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors ${sortBy === SortOption.Alphabetical ? 'text-primary-600 font-medium bg-primary-50/50' : 'text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">
                                <ArrowDownAZ size={16} /> Name (A-Z)
                            </div>
                            {sortBy === SortOption.Alphabetical && <Check size={14} />}
                        </button>
                        <button 
                            onClick={() => { setSortBy(SortOption.Newest); setIsSortDropdownOpen(false); }} 
                            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors ${sortBy === SortOption.Newest ? 'text-primary-600 font-medium bg-primary-50/50' : 'text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Clock size={16} /> Newest First
                            </div>
                            {sortBy === SortOption.Newest && <Check size={14} />}
                        </button>
                        <button 
                            onClick={() => { setSortBy(SortOption.TimeAdded); setIsSortDropdownOpen(false); }} 
                            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors ${sortBy === SortOption.TimeAdded ? 'text-primary-600 font-medium bg-primary-50/50' : 'text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="rotate-180" /> Oldest First
                            </div>
                            {sortBy === SortOption.TimeAdded && <Check size={14} />}
                        </button>
                    </div>
                )}
            </div>
          </div>
        </header>
        
        {/* Mobile Search Bar (visible only on small screens) */}
        <div className="sm:hidden p-4 bg-white border-b border-gray-200">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg outline-none text-sm"
              />
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : 'All Contacts'}
                    </h2>
                    <span className="text-sm text-gray-500">{filteredContacts.length} contacts found</span>
                </div>

                {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Users size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No contacts found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">
                            {searchQuery 
                                ? "No results match your search criteria." 
                                : "Get started by creating a new contact."}
                        </p>
                        {!searchQuery && (
                            <button 
                                onClick={() => {
                                    setEditingContact(undefined);
                                    setIsContactModalOpen(true);
                                }}
                                className="mt-4 text-primary-600 font-medium hover:underline"
                            >
                                Create your first contact
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                        {filteredContacts.map(contact => (
                            <div 
                                key={contact.id} 
                                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col group relative"
                            >
                                <div className="absolute top-4 right-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(contact);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                        title="Edit Contact"
                                    >
                                        <Settings size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteContact(contact.id);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        title="Delete Contact"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-full ${contact.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0`}>
                                        {getInitials(contact.firstName, contact.lastName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">
                                            {contact.prefix && <span className="mr-1 opacity-75 font-normal">{contact.prefix}</span>}
                                            {contact.firstName} {contact.lastName}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate mb-1">
                                            {contact.jobTitle} {contact.jobTitle && contact.company && 'at'} {contact.company}
                                        </p>
                                        {contact.groupId && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGroupColor(contact.groupId).replace('bg-', 'bg-opacity-10 text-').replace('500', '700')} bg-opacity-10`}>
                                                {getGroupName(contact.groupId)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2 pt-4 border-t border-gray-50">
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary-600 transition-colors truncate">
                                        <Mail size={16} className="shrink-0 text-gray-400" />
                                        <span className="truncate">{contact.email}</span>
                                    </a>
                                    <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary-600 transition-colors truncate">
                                        <Phone size={16} className="shrink-0 text-gray-400" />
                                        <span className="truncate">{contact.phone || 'No phone number'}</span>
                                    </a>
                                </div>
                                <div className="mt-auto pt-3 text-[10px] text-gray-400 text-right">
                                    Added {formatDate(contact.createdAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* Modals */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={editingContact ? "Edit Contact" : "Add New Contact"}
      >
        <ContactForm 
            groups={groups}
            onSubmit={editingContact ? handleUpdateContact : handleAddContact}
            onCancel={() => setIsContactModalOpen(false)}
            initialData={editingContact}
        />
      </Modal>

      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Manage Groups"
      >
        <GroupManager 
            groups={groups}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
        />
      </Modal>

    </div>
  );
};

export default App;