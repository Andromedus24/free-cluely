; Windows installer script for Free-Cluely

[Setup]
AppId=com.freecluely.app
AppName=Free-Cluely
AppVersion={#MyAppVersion}
AppPublisher=Free-Cluely Team
AppPublisherURL=https://free-cluely.com
AppSupportURL=https://free-cluely.com/support
AppUpdatesURL=https://free-cluely.com/updates
DefaultDirName={autopf}\Free-Cluely
DefaultGroupName=Free-Cluely
AllowNoIcons=yes
LicenseFile=LICENSE.txt
InfoBeforeFile=README.txt
OutputDir=release
OutputBaseFilename=free-cluely-{#MyAppVersion}-setup
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
Name: "{group}\Free-Cluely"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,Free-Cluely}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Free-Cluely"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Free-Cluely"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,Free-Cluely}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Registry]
Root: HKCU; Subkey: "Software\Free-Cluely"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey

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
    MsgBox('.NET Desktop Runtime 6.0 or later is required to run Free-Cluely.' + #13#13 +
           'Please install .NET Desktop Runtime from https://dotnet.microsoft.com/download and run the setup again.',
           mbError, MB_OK);
    Result := False;
  end
  else
  begin
    Result := True;
  end;
end;