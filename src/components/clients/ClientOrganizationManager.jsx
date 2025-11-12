// ... keep existing code (imports) ...
import ClientOnboardingWizard from "../components/clients/ClientOnboardingWizard";

// ... keep existing code (component definition and all logic until the return statement) ...

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Client Organizations
          </h1>
          <p className="text-slate-600">
            Manage dedicated workspaces for each of your clients with complete data isolation
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Client Workspace
        </Button>
      </div>

      {/* ... keep existing code (search and filters, bulk operations, client grid) ... */}

      {/* NEW: Use ClientOnboardingWizard instead of simple dialog */}
      <ClientOnboardingWizard
        isOpen={showCreateDialog && !editingClient}
        onClose={() => {
          setShowCreateDialog(false);
          resetForm();
        }}
        consultingFirm={consultingFirm}
        onSuccess={(newOrg) => {
          setSelectedClient(newOrg);
        }}
      />

      {/* Edit Dialog - Keep simple for now */}
      <Dialog open={showCreateDialog && !!editingClient} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setEditingClient(null);
          resetForm();
        }
      }}>
        {/* ... keep existing code (edit dialog content) ... */}
      </Dialog>

      {/* ... keep existing code (delete confirmation) ... */}
    </div>
  );
}