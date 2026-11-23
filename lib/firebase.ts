import {getApp,getApps,initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore,initializeFirestore,persistentLocalCache,persistentMultipleTabManager} from "firebase/firestore";

const config={
  apiKey:"AIzaSyBjfsGSp2qIXdCPEYV00Mk2rBKEiwOPunA",
  authDomain:"training-e8090.firebaseapp.com",
  projectId:"training-e8090",
  storageBucket:"training-e8090.firebasestorage.app",
  messagingSenderId:"102537083730",
  appId:"1:102537083730:web:c72273c99b0d274056988b",
  measurementId:"G-RG17SY28D0"
};

let services:ReturnType<typeof makeServices>|undefined;
function makeServices(){
  const existing=getApps().length>0;
  const app=existing?getApp():initializeApp(config);
  const auth=getAuth(app);
  const db=existing?getFirestore(app):initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
  return {app,auth,db};
}
export function getFirebase(){return services??=makeServices()}
export const firebaseProjectId=config.projectId;
