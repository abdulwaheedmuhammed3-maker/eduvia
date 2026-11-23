import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const names = ['PLAY_UPLOAD_KEYSTORE_BASE64','PLAY_UPLOAD_KEYSTORE_PASSWORD','PLAY_UPLOAD_KEY_ALIAS','PLAY_UPLOAD_KEY_PASSWORD'];
const missing=names.filter(n=>!String(process.env[n]||'').trim());
if(missing.length) throw new Error('Missing Play upload signing secrets: '+missing.join(', '));
const encoded=String(process.env.PLAY_UPLOAD_KEYSTORE_BASE64).replace(/\s+/g,'');
if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('PLAY_UPLOAD_KEYSTORE_BASE64 is not valid base64.');
const key=Buffer.from(encoded,'base64');
if(key.length<512||key.toString('base64').replace(/=+$/,'')!==encoded.replace(/=+$/,'')) throw new Error('Upload keystore payload appears invalid.');
const appDir='android/app', groovy=path.join(appDir,'build.gradle'),kts=path.join(appDir,'build.gradle.kts');
const gradlePath=existsSync(groovy)?groovy:existsSync(kts)?kts:null;
if(!gradlePath) throw new Error('Missing generated app Gradle file.');
await mkdir(appDir,{recursive:true});
await writeFile(path.join(appDir,'play-upload-key.jks'),key,{mode:0o600});
let gradle=await readFile(gradlePath,'utf8');
const marker='// EDUVIA_PLAY_UPLOAD_SIGNING';
if(!gradle.includes(marker)){
 const block=gradlePath.endsWith('.kts')?
 [marker,'android {','    signingConfigs {','        create("playUpload") {','            storeFile = file("play-upload-key.jks")','            storePassword = System.getenv("PLAY_UPLOAD_KEYSTORE_PASSWORD")','            keyAlias = System.getenv("PLAY_UPLOAD_KEY_ALIAS")','            keyPassword = System.getenv("PLAY_UPLOAD_KEY_PASSWORD")','        }','    }','    buildTypes {','        getByName("release") {','            signingConfig = signingConfigs.getByName("playUpload")','            isDebuggable = false','        }','    }','}'].join('\n'):
 [marker,'android {','    signingConfigs {','        playUpload {','            storeFile file("play-upload-key.jks")','            storePassword System.getenv("PLAY_UPLOAD_KEYSTORE_PASSWORD")','            keyAlias System.getenv("PLAY_UPLOAD_KEY_ALIAS")','            keyPassword System.getenv("PLAY_UPLOAD_KEY_PASSWORD")','        }','    }','    buildTypes {','        release {','            signingConfig signingConfigs.playUpload','            debuggable false','        }','    }','}'].join('\n');
 gradle+='\n'+block+'\n';await writeFile(gradlePath,gradle);
}
console.log('Play release signing configured.');
