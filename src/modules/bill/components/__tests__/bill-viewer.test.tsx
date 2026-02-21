import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BillViewer } from '../bill-viewer';
import { useForm } from 'react-hook-form';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { BillData } from '@/types/bill';
import userEvent from '@testing-library/user-event';

// Test Data
const mockBillData: BillData = {
    t: 'KTV Night',
    m: ['Alice', 'Bob', 'Charlie'],
    i: [
        { n: 'Room Fee', p: 300, o: [0, 1, 2] }, // 100 each
        { n: 'Beer', p: 200, o: [1, 2] }         // 100 each (Bob, Charlie)
    ],
    s: false
};

const BillViewerWrapper = ({ onFormUpdate }: { onFormUpdate?: (vals: any) => void }) => {
    const form = useForm<TwqrFormValues>({
        defaultValues: { amount: '', comment: '' }
    });

    // Spy on values
    React.useEffect(() => {
        const sub = form.watch((vals) => {
            if (onFormUpdate) onFormUpdate(vals);
        });
        return () => sub.unsubscribe();
    }, [form, onFormUpdate]);

    return <BillViewer form={form} billData={mockBillData} />;
};

describe('BillViewer Component', () => {
    test('應正確渲染帳單標題與成員列表', () => {
        render(<BillViewerWrapper />);
        
        expect(screen.getByText('KTV Night')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    test('應渲染消費項目', () => {
        render(<BillViewerWrapper />);
        
        expect(screen.getByText('Room Fee')).toBeInTheDocument();
        expect(screen.getByText('$300')).toBeInTheDocument();
        expect(screen.getByText('Beer')).toBeInTheDocument();
        expect(screen.getByText('$200')).toBeInTheDocument();
    });

    test('點擊成員應計算正確金額並更新表單', async () => {
        const user = userEvent.setup();
        const handleUpdate = jest.fn();
        
        render(<BillViewerWrapper onFormUpdate={handleUpdate} />);
        
        // Initial state: No amount calculated
        const amountDisplay = screen.queryByText('您應支付的金額');
        expect(amountDisplay).not.toBeInTheDocument();

        // Click on "Bob" (Index 1)
        // Bob pays: Room(100) + Beer(100) = 200
        const bobBtn = screen.getByRole('button', { name: /Bob/i });
        await user.click(bobBtn);

        await waitFor(() => {
            expect(screen.getByText('您應支付的金額')).toBeInTheDocument();
            // Check Display UI
            expect(screen.getByText('$200', { selector: 'p' })).toBeInTheDocument();
        });

        // Check Form Update Callback
        expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({
            amount: '200'
        }));
    });

    test('切換不同成員應重新計算金額', async () => {
        const user = userEvent.setup();
        render(<BillViewerWrapper />);
        
        // Click Alice (Room 100)
        await user.click(screen.getByRole('button', { name: /Alice/i }));
        await waitFor(() => expect(screen.getByText('$100')).toBeInTheDocument());

        // Click Charlie (Room 100 + Beer 100 = 200)
        await user.click(screen.getByRole('button', { name: /Charlie/i }));
        
        await waitFor(() => {
             const totalAmount = screen.getByText('$200', { selector: 'p' });
             expect(totalAmount).toBeInTheDocument();
        });
    });

    test('選中成員後，相關消費項目應顯示「我也有份」標記', async () => {
        const user = userEvent.setup();
        render(<BillViewerWrapper />);
        
        // Initially no badges
        expect(screen.queryByText(/我也有份/i)).not.toBeInTheDocument();

        // Click Alice (Only Room Fee)
        await user.click(screen.getByRole('button', { name: /Alice/i }));

        await waitFor(() => {
            const badges = screen.getAllByText(/我也有份/i);
            expect(badges.length).toBe(1); // Only for Room Fee
        });
    });
});
