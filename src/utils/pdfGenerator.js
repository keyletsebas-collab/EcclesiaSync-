import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateTemplatePDF = (template, members) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(template.name, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Define table columns
    const tableColumn = ["Name", "Phone", "ID Number", ...template.customFields];

    // Map member data to rows
    const tableRows = members.map(member => {
        const row = [
            member.name,
            member.phone,
            member.number,
            // Map custom fields in order
            ...template.customFields.map(field => member.identifications[field] || '-')
        ];
        return row;
    });

    // Generate table
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [99, 102, 241], // Indigo primary color
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
    });

    // Save
    doc.save(`${template.name.replace(/\s+/g, '_')}_Members.pdf`);
};
