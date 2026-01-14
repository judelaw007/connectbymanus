import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function PlatformSettings() {
  const [platformName, setPlatformName] = useState("MojiTax Connect");
  const [adminEmail, setAdminEmail] = useState("admin@mojitax.com");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const { data: admins, refetch: refetchAdmins } = trpc.settings.getAdmins.useQuery();
  
  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Platform settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save settings: " + error.message);
    },
  });

  const updateDisplayNameMutation = trpc.settings.updateAdminDisplayName.useMutation({
    onSuccess: () => {
      toast.success("Display name updated");
      refetchAdmins();
    },
    onError: (error) => {
      toast.error("Failed to update display name: " + error.message);
    },
  });

  useEffect(() => {
    if (settings) {
      if (settings.platform_name) setPlatformName(settings.platform_name);
      if (settings.admin_email) setAdminEmail(settings.admin_email);
      if (settings.email_notifications_enabled !== undefined) {
        setEmailNotificationsEnabled(settings.email_notifications_enabled === 'true');
      }
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        platformName,
        adminEmail,
        emailNotificationsEnabled,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisplayNameChange = async (userId: number, displayName: string) => {
    await updateDisplayNameMutation.mutateAsync({ userId, displayName });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Configure platform-wide settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform-name">Platform Name</Label>
            <Input 
              id="platform-name" 
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin Email</Label>
            <Input 
              id="admin-email" 
              type="email" 
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Email notifications enabled</p>
              <p className="text-sm text-muted-foreground">Send email notifications for announcements and mentions</p>
            </div>
            <Switch 
              checked={emailNotificationsEnabled}
              onCheckedChange={setEmailNotificationsEnabled}
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Platform Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Admin Display Names
          </CardTitle>
          <CardDescription>
            Set display names for admin users. This name will be shown in chat messages instead of "Admin".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {admins && admins.length > 0 ? (
            admins.map((admin: any) => (
              <AdminDisplayNameRow 
                key={admin.id} 
                admin={admin} 
                onSave={handleDisplayNameChange}
                isSaving={updateDisplayNameMutation.isPending}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No admin users found. Admin users will appear here once they sign in.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AdminDisplayNameRowProps {
  admin: {
    id: number;
    email: string | null;
    name: string | null;
    displayName: string | null;
  };
  onSave: (userId: number, displayName: string) => Promise<void>;
  isSaving: boolean;
}

function AdminDisplayNameRow({ admin, onSave, isSaving }: AdminDisplayNameRowProps) {
  const [displayName, setDisplayName] = useState(admin.displayName || admin.name || "");
  const [hasChanged, setHasChanged] = useState(false);

  const handleChange = (value: string) => {
    setDisplayName(value);
    setHasChanged(value !== (admin.displayName || admin.name || ""));
  };

  const handleSave = async () => {
    await onSave(admin.id, displayName);
    setHasChanged(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{admin.email}</p>
        <Input 
          value={displayName}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter display name (e.g., Esther, Jude)"
          className="mt-1"
        />
      </div>
      <Button 
        size="sm" 
        onClick={handleSave} 
        disabled={!hasChanged || isSaving || !displayName.trim()}
        variant={hasChanged ? "default" : "outline"}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasChanged ? (
          <Save className="h-4 w-4" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
