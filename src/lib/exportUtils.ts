import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Brew, CoffeeBean, Grinder, Brewer, Recipe } from '@/contexts/AppContext';

/**
 * Exports brew data to CSV format
 */
export const exportToCSV = (
  brews: Brew[],
  coffeeBeans: CoffeeBean[],
  grinders: Grinder[],
  brewers: Brewer[],
  recipes: Recipe[]
) => {
  // Helper functions to get names
  const getBeanName = (beanId: string) => {
    const bean = coffeeBeans.find(b => b.id === beanId);
    return bean ? `${bean.name} - ${bean.roaster}` : 'Unknown';
  };

  const getGrinderName = (grinderId: string) => {
    const grinder = grinders.find(g => g.id === grinderId);
    return grinder ? grinder.model : 'Unknown';
  };

  const getBrewerName = (brewerId: string) => {
    const brewer = brewers.find(b => b.id === brewerId);
    return brewer ? brewer.model : 'Unknown';
  };

  const getRecipeName = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.name : 'Unknown';
  };

  // CSV headers
  const headers = [
    'Date',
    'Coffee Bean',
    'Grinder',
    'Brewer',
    'Recipe',
    'Dose (g)',
    'Grind Size',
    'Water (g)',
    'Yield (g)',
    'Temperature (°C)',
    'Brew Time',
    'TDS (%)',
    'Extraction Yield (%)',
    'Rating',
    'Comment'
  ];

  // Convert brews to CSV rows
  const rows = brews.map(brew => [
    new Date(brew.date).toLocaleDateString(),
    getBeanName(brew.coffeeBeanId),
    getGrinderName(brew.grinderId),
    getBrewerName(brew.brewerId),
    getRecipeName(brew.recipeId),
    brew.dose,
    brew.grindSize,
    brew.water,
    brew.yield,
    brew.temperature,
    brew.brewTime,
    brew.tds || '',
    brew.extractionYield || '',
    brew.rating || '',
    brew.comment ? `"${brew.comment.replace(/"/g, '""')}"` : ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `brew-history-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports brew data to PDF format
 */
export const exportToPDF = (
  brews: Brew[],
  coffeeBeans: CoffeeBean[],
  grinders: Grinder[],
  brewers: Brewer[],
  recipes: Recipe[]
) => {
  // Helper functions to get names
  const getBeanName = (beanId: string) => {
    const bean = coffeeBeans.find(b => b.id === beanId);
    return bean ? `${bean.name} - ${bean.roaster}` : 'Unknown';
  };

  const getGrinderName = (grinderId: string) => {
    const grinder = grinders.find(g => g.id === grinderId);
    return grinder ? grinder.model : 'Unknown';
  };

  const getBrewerName = (brewerId: string) => {
    const brewer = brewers.find(b => b.id === brewerId);
    return brewer ? brewer.model : 'Unknown';
  };

  const getRecipeName = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.name : 'Unknown';
  };

  // Create PDF document
  const doc = new jsPDF('landscape');
  
  // Add title
  doc.setFontSize(18);
  doc.text('Brew History Report', 14, 15);
  
  // Add generation date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
  
  // Add summary statistics
  const avgRating = brews.reduce((sum, brew) => sum + (brew.rating || 0), 0) / brews.length;
  const avgEY = brews.reduce((sum, brew) => sum + (brew.extractionYield || 0), 0) / brews.length;
  
  doc.text(`Total Brews: ${brews.length}`, 14, 28);
  doc.text(`Average Rating: ${avgRating.toFixed(1)}/5`, 70, 28);
  doc.text(`Average Extraction Yield: ${avgEY.toFixed(2)}%`, 140, 28);
  
  // Prepare table data
  const tableData = brews.map(brew => [
    new Date(brew.date).toLocaleDateString(),
    getBeanName(brew.coffeeBeanId),
    getGrinderName(brew.grinderId),
    getBrewerName(brew.brewerId),
    getRecipeName(brew.recipeId),
    `${brew.dose}g`,
    brew.grindSize.toString(),
    `${brew.water}g`,
    `${brew.yield}g`,
    `${brew.temperature}°C`,
    brew.brewTime,
    brew.tds ? `${brew.tds.toFixed(2)}%` : '-',
    brew.extractionYield ? `${brew.extractionYield.toFixed(2)}%` : '-',
    brew.rating ? `${brew.rating}/5` : '-'
  ]);

  // Add table
  autoTable(doc, {
    startY: 35,
    head: [[
      'Date',
      'Coffee Bean',
      'Grinder',
      'Brewer',
      'Recipe',
      'Dose',
      'Grind',
      'Water',
      'Yield',
      'Temp',
      'Time',
      'TDS',
      'EY',
      'Rating'
    ]],
    body: tableData,
    styles: {
      fontSize: 7,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [139, 69, 19], // Coffee brown color
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 220] // Cream color
    },
    margin: { top: 35 }
  });

  // Add detailed brew notes on separate pages if there are comments
  const brewsWithComments = brews.filter(brew => brew.comment);
  
  if (brewsWithComments.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Brew Notes & Comments', 14, 15);
    
    let yPosition = 25;
    
    brewsWithComments.forEach((brew, index) => {
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 15;
      }
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(
        `${new Date(brew.date).toLocaleDateString()} - ${getBeanName(brew.coffeeBeanId)}`,
        14,
        yPosition
      );
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      const comment = brew.comment || '';
      const splitComment = doc.splitTextToSize(comment, 260);
      doc.text(splitComment, 14, yPosition + 5);
      
      yPosition += 5 + (splitComment.length * 4) + 8;
    });
  }

  // Save the PDF
  doc.save(`brew-history-${new Date().toISOString().split('T')[0]}.pdf`);
};
