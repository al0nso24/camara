import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, Camera } from 'expo-camera';

export default function App(){
  //null = preguntando | true = concedido | false = denegado
  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto] = useState(null); //URI de la foto
  const [isCameraReady, setIsCameraReady] = useState(false); //true cuando esté lista
  const [isTaking, setIsTaking] = useState(false); //evita tomar dos fotos con doble toque

  const [facing, setFacing] = useState("back"); //Comienza con la cámara trasera
  const [flash, setFlash] = useState("off"); //Empieza apagado

  const cameraRef = useRef(null); //referencia a la cámara

  //Pedir permisos (se ejecuta una sola vez)
  useEffect(() => {
    //useEffect no puede ser async, por eso se usa una función async que se ejecuta sola
    (async () => {
      const {status} = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status == "granted"); //puede ser 'granted', 'denied' o 'undetermined'
    })
  }, []) //vacío porque se ejecuta una sola vez al abrir la app

  //Cambiar el modo de cámara (trasera o frontal)
  const cambiarCamara = () => {
    setIsCameraReady(false);
    //Usa el valor más reciente del estado. Al girar, isCameraReady vuelve a false hasta que la nueva cámara esté lista
    setFacing((actual) => (actual === "back" ? "front" : "back"));
  }

  //Prender o apagar el flash de la cámara
  const cambiarFlash = () => {
    setFlash((actual) => (actual === "off" ? "on" : "off"));
  }

  //Tomar foto
  const tomarFoto = async () => {
    if(!cameraRef.current || !isCameraReady || isTaking){
      return;
    }
    try{
      setIsTaking(true);
      const foto = await cameraRef.current.takePictureAsync({quality: 0.7}); //toma la foto
      setPhoto(foto.uri); //cambia a la vista IMAGEN
    }catch (error){
      Alert.alert("Error", "No se pudo tomar la foto.");
    }finally{
      setIsTaking(false); //pase lo que pase o simplemente cuando se terminó de tomar la foto
    }
  }

  //Volver a la cámara
  const volverCamara = () => {
    setPhoto(null); //borra la foto del estado
    setIsCameraReady(false);
  }

  //Esperando la respuesta del usuario para aceptar los permisos de la cámara
  if (hasPermission === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#E30613" />
        <Text style={styles.mensaje}>
          Solicitando permiso de cámara...
        </Text>
      </View>
    );
  }

  //Permiso denegado
  if (hasPermission === false) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.icono}> </Text>
        <Text style={styles.mensaje}>Sin acceso a la cámara.</Text>
        <Text style={styles.submensaje}>
          Activa el permiso desde Ajustes para usar CameraApp UTP.
        </Text>
      </View>
    );
  }

  const deshabilitado = !isCameraReady || isTaking;
  return (
    <View style={styles.contenedor}>
      <StatusBar style="light" />
      <Text style={styles.titulo}>CameraApp UTP</Text>
      <CameraView
        ref={cameraRef}
        style={styles.camara}
        facing="back"
        onCameraReady={() => setIsCameraReady(true)}
      />
      <TouchableOpacity
        style={[styles.boton, deshabilitado && styles.botonOff]}
        onPress={tomarFoto}
        disabled={deshabilitado}
      >
        <Text style={styles.textoBoton}>
          {/*Cuando se toma la foto*/}
          {isTaking ? 'Procesando...' : 'Tomar foto'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: 55,
    paddingBottom: 55,
    paddingHorizontal: 16,
  },

  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },

  titulo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },

  camara: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },

  preview: {
    flex: 1,
    borderRadius: 16,
  },

  boton: {
    backgroundColor: '#E30613',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  
  botonOff: { opacity: 0.5 },
  textoBoton: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  icono: {
    fontSize: 48,
    marginBottom: 12,
  },

  mensaje: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },

  submensaje: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
})