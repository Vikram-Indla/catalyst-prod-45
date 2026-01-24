import { formatDateV8 } from '@/constants/users';

interface DateCellProps {
  date: string | Date | null;
}

export const DateCell: React.FC<DateCellProps> = ({ date }) => {
  return <span className="ct-date-cell">{formatDateV8(date)}</span>;
};
