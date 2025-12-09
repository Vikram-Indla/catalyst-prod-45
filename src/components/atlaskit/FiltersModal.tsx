import { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import { token } from '@atlaskit/tokens';
import { PROCESS_STEPS } from '@/types/business-request';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

export interface FilterValues {
  processStep: { label: string; value: string }[];
  businessOwner: { label: string; value: string }[];
  quarter: { label: string; value: string }[];
  department: { label: string; value: string }[];
  deliveryPlatform: { label: string; value: string }[];
}

const processStepOptions = PROCESS_STEPS.map(step => ({
  label: step.label,
  value: step.value,
}));

const quarterOptions = [
  { label: 'Q1 2024', value: 'Q1-2024' },
  { label: 'Q2 2024', value: 'Q2-2024' },
  { label: 'Q3 2024', value: 'Q3-2024' },
  { label: 'Q4 2024', value: 'Q4-2024' },
  { label: 'Q1 2025', value: 'Q1-2025' },
  { label: 'Q2 2025', value: 'Q2-2025' },
];

const departmentOptions = [
  { label: 'IT', value: 'IT' },
  { label: 'Operations', value: 'Operations' },
  { label: 'Finance', value: 'Finance' },
  { label: 'HR', value: 'HR' },
  { label: 'Sales', value: 'Sales' },
];

const deliveryPlatformOptions = [
  { label: 'Web', value: 'Web' },
  { label: 'Mobile', value: 'Mobile' },
  { label: 'Desktop', value: 'Desktop' },
  { label: 'API', value: 'API' },
];

export function FiltersModal({ isOpen, onClose, onApply, initialFilters }: FiltersModalProps) {
  const [filters, setFilters] = useState<FilterValues>(initialFilters || {
    processStep: [],
    businessOwner: [],
    quarter: [],
    department: [],
    deliveryPlatform: [],
  });

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({
      processStep: [],
      businessOwner: [],
      quarter: [],
      department: [],
      deliveryPlatform: [],
    });
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="large">
          <ModalHeader>
            <ModalTitle>Filter Requests</ModalTitle>
          </ModalHeader>
          
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.300', '24px') }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: token('space.100', '8px'),
                  color: token('color.text', '#172B4D'),
                }}>
                  Process Step
                </label>
                <Select
                  isMulti
                  placeholder="Select process steps..."
                  options={processStepOptions}
                  value={filters.processStep}
                  onChange={(value) => setFilters({ ...filters, processStep: value as any })}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: token('space.100', '8px'),
                  color: token('color.text', '#172B4D'),
                }}>
                  Quarter
                </label>
                <Select
                  isMulti
                  placeholder="Select quarters..."
                  options={quarterOptions}
                  value={filters.quarter}
                  onChange={(value) => setFilters({ ...filters, quarter: value as any })}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: token('space.100', '8px'),
                  color: token('color.text', '#172B4D'),
                }}>
                  Department
                </label>
                <Select
                  isMulti
                  placeholder="Select departments..."
                  options={departmentOptions}
                  value={filters.department}
                  onChange={(value) => setFilters({ ...filters, department: value as any })}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: token('space.100', '8px'),
                  color: token('color.text', '#172B4D'),
                }}>
                  Delivery Platform
                </label>
                <Select
                  isMulti
                  placeholder="Select platforms..."
                  options={deliveryPlatformOptions}
                  value={filters.deliveryPlatform}
                  onChange={(value) => setFilters({ ...filters, deliveryPlatform: value as any })}
                />
              </div>
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button appearance="subtle" onClick={handleClear}>
              Clear All
            </Button>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleApply}>
              Apply Filters
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default FiltersModal;
