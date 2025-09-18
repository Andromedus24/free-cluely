; Windows installer script for Atlas: All in one assistant

[Setup]
AppId=com.atlas.assistant
AppName=Atlas: All in one assistant
AppVersion={#MyAppVersion}
AppPublisher=Ronak Prabhu
AppPublisherURL=https://atlas-assistant.com
AppSupportURL=https://atlas-assistant.com/support
AppUpdatesURL=https://atlas-assistant.com/updates
DefaultDirName={autopf}\Atlas Assistant
DefaultGroupName=Atlas Assistant
AllowNoIcons=yes
LicenseFile=LICENSE.txt
InfoBeforeFile=README.txt
OutputDir=release
OutputBaseFilename=atlas-assistant-{#MyAppVersion}-setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=yes
DisableFinishedPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Atlas Assistant"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,Atlas Assistant}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Atlas Assistant"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Atlas Assistant"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,Atlas Assistant}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Registry]
Root: HKCU; Subkey: "Software\Atlas Assistant"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey

[Code]
// Check if .NET Desktop Runtime is installed
function IsDotNetInstalled: Boolean;
var
  success: Boolean;
  installPath: String;
begin
  // Check for .NET 6.0 or later
  success := RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v6\Full', 'InstallPath', installPath);
  Result := success and (installPath <> '');
end;

function InitializeSetup(): Boolean;
begin
  if not IsDotNetInstalled then
  begin
    MsgBox('.NET Desktop Runtime 6.0 or later is required to run Atlas Assistant.' + #13#13 +
           'Please install .NET Desktop Runtime from https://dotnet.microsoft.com/download and run the setup again.',
           mbError, MB_OK);
    Result := False;
  end
  else
  begin
    Result := True;
  end;
end;