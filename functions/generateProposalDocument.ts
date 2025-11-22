import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer, PageNumber } from "npm:docx@8.5.0";
import { jsPDF } from "npm:jspdf@2.5.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { proposalId, sectionIds, format, templateId, options = {} } = await req.json();

    if (!proposalId || !sectionIds || !format) {
      return Response.json({ 
        error: 'Missing required parameters: proposalId, sectionIds, format' 
      }, { status: 400 });
    }

    // Fetch proposal
    const proposal = await base44.asServiceRole.entities.Proposal.filter({ id: proposalId });
    if (!proposal || proposal.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposalData = proposal[0];

    // Determine watermark automatically based on proposal status
    const approvedStatuses = ['approved', 'submitted', 'won', 'client_accepted'];
    const shouldWatermark = !approvedStatuses.includes(proposalData.status);

    // Fetch sections
    const sections = await base44.asServiceRole.entities.ProposalSection.filter({
      proposal_id: proposalId
    });

    // Filter and sort sections
    const selectedSections = sections
      .filter(s => sectionIds.includes(s.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (selectedSections.length === 0) {
      return Response.json({ error: 'No valid sections found' }, { status: 400 });
    }

    // Generate document based on format
    let fileBlob;
    let fileName;

    if (format === 'docx') {
      const result = await generateDOCX(proposalData, selectedSections, shouldWatermark, options);
      fileBlob = result.blob;
      fileName = result.fileName;
    } else if (format === 'pdf') {
      const result = await generatePDF(proposalData, selectedSections, shouldWatermark, options);
      fileBlob = result.blob;
      fileName = result.fileName;
    } else {
      return Response.json({ error: 'Invalid format. Use "docx" or "pdf"' }, { status: 400 });
    }

    // Upload to private storage
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: fileBlob
    });

    if (!uploadResult || !uploadResult.file_uri) {
      throw new Error('Failed to upload file to storage');
    }

    // Generate signed URL (valid for 7 days)
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    const signedUrlResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: uploadResult.file_uri,
      expires_in: expiresIn
    });

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);

    // Create export history record
    const exportRecord = await base44.asServiceRole.entities.ExportHistory.create({
      proposal_id: proposalId,
      organization_id: proposalData.organization_id,
      exported_by_email: user.email,
      exported_by_name: user.full_name,
      export_format: format,
      has_watermark: shouldWatermark,
      proposal_status_at_export: proposalData.status,
      template_id: templateId || null,
      sections_exported: sectionIds,
      file_name: fileName,
      file_size_bytes: fileBlob.size,
      file_uri: uploadResult.file_uri,
      download_url: signedUrlResult.signed_url,
      expires_at: expiryDate.toISOString(),
      options: JSON.stringify(options)
    });

    return Response.json({
      success: true,
      export_id: exportRecord.id,
      file_name: fileName,
      file_size_bytes: fileBlob.size,
      download_url: signedUrlResult.signed_url,
      expires_at: expiryDate.toISOString(),
      has_watermark: shouldWatermark,
      proposal_status: proposalData.status
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ 
      error: 'Failed to generate document',
      details: error.message 
    }, { status: 500 });
  }
});

// ==================== DOCX Generation ====================
async function generateDOCX(proposal, sections, shouldWatermark, options) {
  const docSections = [];

  // Add watermark header if needed
  const watermarkHeader = shouldWatermark ? new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "DRAFT",
            color: "CCCCCC",
            size: 72,
            bold: true,
          })
        ]
      })
    ]
  }) : undefined;

  // Cover page
  if (options.includeCoverPage !== false) {
    docSections.push(
      new Paragraph({
        text: proposal.proposal_name,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: proposal.project_title || '',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: proposal.agency_name || '',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: proposal.solicitation_number || '',
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString()}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    if (shouldWatermark) {
      docSections.push(
        new Paragraph({
          text: "*** DRAFT VERSION - FOR REVIEW ONLY ***",
          alignment: AlignmentType.CENTER,
          bold: true,
          color: "FF6600",
          spacing: { before: 400 }
        })
      );
    }
  }

  // Table of contents
  if (options.includeTableOfContents !== false) {
    docSections.push(
      new Paragraph({
        text: "Table of Contents",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        pageBreakBefore: true
      })
    );

    sections.forEach((section, index) => {
      docSections.push(
        new Paragraph({
          text: `${index + 1}. ${section.section_name}`,
          spacing: { after: 100 }
        })
      );
    });
  }

  // Add sections
  sections.forEach((section) => {
    docSections.push(
      new Paragraph({
        text: section.section_name,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        pageBreakBefore: true
      })
    );

    if (section.content) {
      // Simple content parsing (strip HTML)
      const plainText = section.content.replace(/<[^>]*>/g, '').trim();
      const paragraphs = plainText.split('\n\n');
      
      paragraphs.forEach(para => {
        if (para.trim()) {
          docSections.push(
            new Paragraph({
              text: para.trim(),
              spacing: { after: 200 }
            })
          );
        }
      });
    } else {
      docSections.push(
        new Paragraph({
          text: "[Content not available]",
          italics: true,
          color: "999999",
          spacing: { after: 200 }
        })
      );
    }
  });

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      headers: watermarkHeader ? {
        default: watermarkHeader
      } : undefined,
      children: docSections
    }]
  });

  // Generate blob
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = proposal.proposal_name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  const fileName = `${safeName}_${timestamp}.docx`;

  return { blob, fileName };
}

// ==================== PDF Generation ====================
async function generatePDF(proposal, sections, shouldWatermark, options) {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;

  // Helper: Add watermark to current page
  const addWatermark = () => {
    if (!shouldWatermark) return;
    
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.15 }));
    doc.setFontSize(80);
    doc.setTextColor(200, 200, 200);
    doc.text('DRAFT', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    doc.restoreGraphicsState();
  };

  // Helper: Check page and add new if needed
  const checkPage = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      addWatermark();
      yPosition = 20;
    }
  };

  // Add watermark to first page
  addWatermark();

  // Cover page
  if (options.includeCoverPage !== false) {
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(proposal.proposal_name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    if (proposal.project_title) {
      doc.text(proposal.project_title, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }
    if (proposal.agency_name) {
      doc.text(proposal.agency_name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }
    if (proposal.solicitation_number) {
      doc.text(proposal.solicitation_number, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

    if (shouldWatermark) {
      yPosition += 20;
      doc.setFontSize(12);
      doc.setTextColor(255, 102, 0);
      doc.setFont(undefined, 'bold');
      doc.text('*** DRAFT VERSION - FOR REVIEW ONLY ***', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    doc.addPage();
    addWatermark();
    yPosition = 20;
  }

  // Table of contents
  if (options.includeTableOfContents !== false) {
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Table of Contents', margin, yPosition);
    yPosition += 12;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    sections.forEach((section, index) => {
      checkPage();
      doc.text(`${index + 1}. ${section.section_name}`, margin + 5, yPosition);
      yPosition += 8;
    });

    doc.addPage();
    addWatermark();
    yPosition = 20;
  }

  // Add sections
  sections.forEach((section, index) => {
    checkPage(30);

    // Section heading
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(section.section_name, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    if (section.content) {
      // Strip HTML and split into paragraphs
      const plainText = section.content.replace(/<[^>]*>/g, '').trim();
      const paragraphs = plainText.split('\n\n');

      paragraphs.forEach(para => {
        if (para.trim()) {
          const lines = doc.splitTextToSize(para.trim(), maxWidth);
          lines.forEach(line => {
            checkPage();
            doc.text(line, margin, yPosition);
            yPosition += 6;
          });
          yPosition += 4; // Extra space between paragraphs
        }
      });
    } else {
      checkPage();
      doc.setFont(undefined, 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('[Content not available]', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      yPosition += 10;
    }

    yPosition += 10;
  });

  // Convert to blob
  const pdfBlob = doc.output('blob');

  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = proposal.proposal_name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  const fileName = `${safeName}_${timestamp}.pdf`;

  return { blob: pdfBlob, fileName };
}