import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, User, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function PlatformSettings() {
  const [platformName, setPlatformName] = useState("MojiTax Connect");
  const [adminEmail, setAdminEmail] = useState("admin@mojitax.com");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Admin hours state
  const [adminHoursEnabled, setAdminHoursEnabled] = useState(true);
  const [adminTimezone, setAdminTimezone] = useState("Europe/London");
  const [adminStartTime, setAdminStartTime] = useState("09:00");
  const [adminEndTime, setAdminEndTime] = useState("17:00");
  const [adminDays, setAdminDays] = useState("mon,tue,wed,thu,fri");
  const [avgResponseMinutes, setAvgResponseMinutes] = useState(60);
  const [isSavingHours, setIsSavingHours] = useState(false);

  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const { data: admins, refetch: refetchAdmins } =
    trpc.settings.getAdmins.useQuery();

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Platform settings saved successfully");
    },
    onError: error => {
      toast.error("Failed to save settings: " + error.message);
    },
  });

  const updateAdminHoursMutation = trpc.settings.updateAdminHours.useMutation({
    onSuccess: () => {
      toast.success("Admin hours saved successfully");
    },
    onError: error => {
      toast.error("Failed to save admin hours: " + error.message);
    },
  });

  const updateDisplayNameMutation =
    trpc.settings.updateAdminDisplayName.useMutation({
      onSuccess: () => {
        toast.success("Display name updated");
        refetchAdmins();
      },
      onError: error => {
        toast.error("Failed to update display name: " + error.message);
      },
    });

  useEffect(() => {
    if (settings) {
      if (settings.platform_name) setPlatformName(settings.platform_name);
      if (settings.admin_email) setAdminEmail(settings.admin_email);
      if (settings.email_notifications_enabled !== undefined) {
        setEmailNotificationsEnabled(
          settings.email_notifications_enabled === "true"
        );
      }
      if (settings.admin_hours_enabled !== undefined) {
        setAdminHoursEnabled(settings.admin_hours_enabled === "true");
      }
      if (settings.admin_hours_timezone)
        setAdminTimezone(settings.admin_hours_timezone);
      if (settings.admin_hours_start)
        setAdminStartTime(settings.admin_hours_start);
      if (settings.admin_hours_end) setAdminEndTime(settings.admin_hours_end);
      if (settings.admin_hours_days) setAdminDays(settings.admin_hours_days);
      if (settings.admin_avg_response_minutes) {
        setAvgResponseMinutes(
          parseInt(settings.admin_avg_response_minutes, 10)
        );
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

  const handleSaveAdminHours = async () => {
    setIsSavingHours(true);
    try {
      await updateAdminHoursMutation.mutateAsync({
        enabled: adminHoursEnabled,
        timezone: adminTimezone,
        startTime: adminStartTime,
        endTime: adminEndTime,
        days: adminDays,
        avgResponseMinutes,
      });
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleDisplayNameChange = async (
    userId: number,
    displayName: string
  ) => {
    await updateDisplayNameMutation.mutateAsync({ userId, displayName });
  };

  const allDays = [
    { key: "mon", label: "Mon" },
    { key: "tue", label: "Tue" },
    { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" },
    { key: "fri", label: "Fri" },
    { key: "sat", label: "Sat" },
    { key: "sun", label: "Sun" },
  ];

  const toggleDay = (day: string) => {
    const current = adminDays.split(",").filter(Boolean);
    if (current.includes(day)) {
      setAdminDays(current.filter(d => d !== day).join(","));
    } else {
      setAdminDays([...current, day].join(","));
    }
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
              onChange={e => setPlatformName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Email notifications enabled</p>
              <p className="text-sm text-muted-foreground">
                Send email notifications for announcements and mentions
              </p>
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

      {/* Admin Hours Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Admin Availability Hours
          </CardTitle>
          <CardDescription>
            Set when Team MojiTax is available for live conversations. Members
            will see availability status and estimated response times.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Enable admin hours</p>
              <p className="text-sm text-muted-foreground">
                Show availability status to members based on schedule
              </p>
            </div>
            <Switch
              checked={adminHoursEnabled}
              onCheckedChange={setAdminHoursEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={adminTimezone} onValueChange={setAdminTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/London">
                  Europe/London (GMT/BST)
                </SelectItem>
                <SelectItem value="Europe/Paris">
                  Europe/Paris (CET/CEST)
                </SelectItem>
                <SelectItem value="America/New_York">
                  America/New_York (EST/EDT)
                </SelectItem>
                <SelectItem value="America/Chicago">
                  America/Chicago (CST/CDT)
                </SelectItem>
                <SelectItem value="America/Los_Angeles">
                  America/Los_Angeles (PST/PDT)
                </SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                <SelectItem value="Africa/Johannesburg">
                  Africa/Johannesburg (SAST)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={adminStartTime}
                onChange={e => setAdminStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={adminEndTime}
                onChange={e => setAdminEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex gap-2 flex-wrap">
              {allDays.map(day => (
                <Button
                  key={day.key}
                  type="button"
                  size="sm"
                  variant={adminDays.includes(day.key) ? "default" : "outline"}
                  onClick={() => toggleDay(day.key)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg-response">
              Average Response Time (minutes)
            </Label>
            <Input
              id="avg-response"
              type="number"
              min={1}
              max={1440}
              value={avgResponseMinutes}
              onChange={e =>
                setAvgResponseMinutes(parseInt(e.target.value, 10))
              }
            />
            <p className="text-xs text-muted-foreground">
              This is shown to members so they know how long to expect before a
              human reply.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleSaveAdminHours}
            disabled={isSavingHours}
          >
            {isSavingHours ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Admin Hours
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
            Set display names for admin users. This name will be shown in chat
            messages instead of "Admin".
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
              No admin users found. Admin users will appear here once they sign
              in.
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

function AdminDisplayNameRow({
  admin,
  onSave,
  isSaving,
}: AdminDisplayNameRowProps) {
  const [displayName, setDisplayName] = useState(
    admin.displayName || admin.name || ""
  );
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
          onChange={e => handleChange(e.target.value)}
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
