import { useState, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import SearchIcon from '@atlaskit/icon/glyph/search';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assignee: string) => void;
  selectedCount: number;
}

interface User {
  id: string;
  email: string;
  display_name: string | null;
}

export function BulkAssignModal({ isOpen, onClose, onConfirm, selectedCount }: BulkAssignModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .limit(50);
      
      if (error) throw error;
      setUsers((data || []).map(u => ({
        id: u.id,
        email: u.email || '',
        display_name: u.full_name || null,
      })));
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      user.email?.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query)
    );
  });

  const handleConfirm = () => {
    if (selectedUser) {
      onConfirm(selectedUser.display_name || selectedUser.email);
      onClose();
      setSelectedUser(null);
      setSearchQuery('');
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose}>
          <ModalHeader>
            <ModalTitle>Assign Requests</ModalTitle>
          </ModalHeader>
          
          <ModalBody>
            <p style={{ 
              marginBottom: token('space.200', '16px'),
              color: token('color.text.subtle', '#6B778C'),
              fontSize: '14px',
            }}>
              Assign {selectedCount} selected request{selectedCount > 1 ? 's' : ''} to:
            </p>
            
            <div style={{ marginBottom: token('space.200', '16px') }}>
              <Textfield
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                elemBeforeInput={<SearchIcon label="Search" size="small" />}
              />
            </div>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '3px',
            }}>
              {isLoading ? (
                <div style={{ padding: token('space.200', '16px'), textAlign: 'center' }}>
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ 
                  padding: token('space.200', '16px'), 
                  textAlign: 'center',
                  color: token('color.text.subtle', '#6B778C'),
                }}>
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    style={{
                      width: '100%',
                      padding: token('space.150', '12px'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: token('space.100', '8px'),
                      background: selectedUser?.id === user.id 
                        ? token('color.background.selected', '#DEEBFF') 
                        : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: token('color.background.neutral', '#DFE1E6'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: token('color.text', '#172B4D'),
                    }}>
                      {(user.display_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 500,
                        color: token('color.text', '#172B4D'),
                      }}>
                        {user.display_name || 'Unnamed User'}
                      </div>
                      <div style={{ 
                        fontSize: '12px',
                        color: token('color.text.subtle', '#6B778C'),
                      }}>
                        {user.email}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              appearance="primary" 
              onClick={handleConfirm}
              isDisabled={!selectedUser}
            >
              Assign to {selectedUser?.display_name || selectedUser?.email || 'User'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default BulkAssignModal;
