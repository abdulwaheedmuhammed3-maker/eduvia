package com.eduvia.studyplanner;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "EduviaFileExport")
public class EduviaFileExportPlugin extends Plugin {
    private static class PendingFile {
        final Uri uri;
        final String fileName;
        final OutputStream stream;

        PendingFile(Uri uri, String fileName, OutputStream stream) {
            this.uri = uri;
            this.fileName = fileName;
            this.stream = stream;
        }
    }

    private final Map<String, PendingFile> pendingFiles = new ConcurrentHashMap<>();

    @PluginMethod
    public void beginSave(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Direct Downloads saving requires Android 10 or later. Update Android to save backups directly.");
            return;
        }

        String suppliedName = call.getString("fileName", "eduvia-backup.zip");
        String fileName = suppliedName.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (fileName.isEmpty() || fileName.equals(".") || fileName.equals("..")) fileName = "eduvia-backup.zip";
        String mimeType = call.getString("mimeType", "application/octet-stream");

        Uri uri = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Eduvia");
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("Android could not create a file in Downloads/Eduvia.");
            OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "w");
            if (stream == null) throw new IllegalStateException("Android could not open the new backup file.");
            String fileId = UUID.randomUUID().toString();
            pendingFiles.put(fileId, new PendingFile(uri, fileName, stream));

            JSObject result = new JSObject();
            result.put("fileId", fileId);
            call.resolve(result);
        } catch (Exception error) {
            if (uri != null) getContext().getContentResolver().delete(uri, null, null);
            call.reject("Could not create the backup in Downloads/Eduvia: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void writeChunk(PluginCall call) {
        String fileId = call.getString("fileId", "");
        String encoded = call.getString("data", "");
        PendingFile file = pendingFiles.get(fileId);
        if (file == null) {
            call.reject("The backup file session is no longer available.");
            return;
        }
        try {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            file.stream.write(bytes);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not write backup data: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void finishSave(PluginCall call) {
        String fileId = call.getString("fileId", "");
        PendingFile file = pendingFiles.remove(fileId);
        if (file == null) {
            call.reject("The backup file session is no longer available.");
            return;
        }
        try {
            file.stream.flush();
            file.stream.close();
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.IS_PENDING, 0);
            int updated = getContext().getContentResolver().update(file.uri, values, null, null);
            if (updated < 1) throw new IllegalStateException("Android could not finish saving the backup.");
            JSObject result = new JSObject();
            result.put("fileName", file.fileName);
            result.put("directory", "Downloads/Eduvia");
            result.put("uri", file.uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            getContext().getContentResolver().delete(file.uri, null, null);
            call.reject("The backup could not be completed: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void cancelSave(PluginCall call) {
        String fileId = call.getString("fileId", "");
        PendingFile file = pendingFiles.remove(fileId);
        if (file != null) {
            try { file.stream.close(); } catch (Exception ignored) {}
            getContext().getContentResolver().delete(file.uri, null, null);
        }
        call.resolve();
    }
}
