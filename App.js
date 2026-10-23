import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@camara:fotos'; //nombre con el que AsyncStorage guarda la galería
const MAX_FOTOS = 3; //limita la lista a 3 fotos

const formatearFecha = (fecha) => {
  const dd = (n) => String(n).padStart(2, "0");
  const dia = `${dd(fecha.getDate())}/${dd(fecha.getMonth() + 1)}`;
  const hora = `${dd(fecha.getHours())}:${dd(fecha.getMinutes())}`;
  return `${dia}/${fecha.getFullYear()} ${hora}:${dd(fecha.getSeconds())}`;
}

export default function App() {
  //null = preguntando | true = concedido | false = denegado
  const [hasPermission, setHasPermission] = useState(null);
  const [canAskAgain, setCanAskAgain] = useState(true); //volver a mostrar la solicitud de permiso
  const [photo, setPhoto] = useState(null); //URI de la foto
  const [isCameraReady, setIsCameraReady] = useState(false); //true cuando esté lista
  const [isTaking, setIsTaking] = useState(false); //evita tomar dos fotos con doble toque

  const [facing, setFacing] = useState("back"); //comienza con la cámara trasera
  const [flash, setFlash] = useState("off"); //empieza apagado
  const [galeria, setGaleria] = useState([]); //galería de fotos

  const cameraRef = useRef(null); //referencia a la cámara

  const pedirPermiso = useCallback(async () => {
    const permiso = await Camera.requestCameraPermissionsAsync();
    setHasPermission(permiso.granted);
    setCanAskAgain(permiso.canAskAgain);
  }, []);

  useEffect(() => {
    pedirPermiso();
  }, [pedirPermiso]); //se ejcuta cuando la función cambia

  //Cambiar el modo de cámara (trasera o frontal)
  const cambiarCamara = () => {
    setIsCameraReady(false);
    //Usa el valor más reciente del estado. Al girar, isCameraReady vuelve a false hasta que la nueva cámara esté lista
    setFacing((actual) => (actual === "back" ? "front" : "back"));
  }

  //Prender o apagar el flash de la cámara
  const cambiarFlash = () => {
    //Inicialmente el flash está apagado
    setFlash((actual) => (actual === "off" ? "on" : "off"));
  }

  const cargarGaleria = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        setGaleria(JSON.parse(json));
      }
    } catch (error) {
      console.log("Error al leer AsyncStorage", error);
    }
  }, []);

  useEffect(() => {
    cargarGaleria();
  }, [cargarGaleria]);

  const guardarEnGaleria = async (nuevaFoto) => {
    const actualizada = [nuevaFoto, ...galeria].slice(0, MAX_FOTOS); //conserva solo los primeros tres
    setGaleria(actualizada);
    try {
      const json = JSON.stringify(actualizada);
      await AsyncStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
      console.log('Error al guardar en AsyncStorage:', error);
    }
  };

  //Borra todas las fotos de la galería
  const limpiarGaleria = async () => {
    setGaleria([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  //Tomar foto
  const tomarFoto = async () => {
    //Si no hay una cámara conectada, todavía no está lista o ya se está capturando otra foto.
    if (!cameraRef.current || !isCameraReady || isTaking) {
      return;
    }

    try {
      setIsTaking(true);
      const foto = await cameraRef.current.takePictureAsync({ quality: 0.7 }); //toma la foto (70% de calidad)
      const nuevaFoto = { //crea la nueva foto
        uri: foto.uri, fecha: formatearFecha(new Date())
      }
      setPhoto(nuevaFoto); //guarda la nueva foto
      await guardarEnGaleria(nuevaFoto); //guarda la foto en la lista de la galería
      console.log("Foto tomada :3");
    } catch (error) {
      Alert.alert("Error", "No se pudo tomar la foto."); //mensaje de error
    } finally {
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
          CameraApp UTP necesita la cámara para tomar fotos.
        </Text>
        <TouchableOpacity
          style={[styles.boton, styles.botonAncho]}
          //Vuelve a preguntar de nuevo sobre los permisos
          onPress={
            canAskAgain ? pedirPermiso : () => Linking.openSettings()
          }
        >
          <Text style={styles.textoBoton}>
            {canAskAgain ? 'Conceder permiso' : 'Abrir Ajustes'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  //Vista previa de la foto
  if (photo) {
    return (
      <View style={styles.contenedor}>
        <StatusBar style="light" />
        <Text style={styles.titulo}> Foto capturada</Text>
        <Image
          source={{ uri: photo.uri }}
          style={styles.preview}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.boton} onPress={volverCamara}>
        {/*Al pulsar "volverCamara" establece photo en null, y vuelve a la vista de la cámara*/}
          <Text style={styles.textoBoton}>Volver a cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  //Está deshabilitado cuando la cámara no está lista o cuandoya se está tomando otra foto
  const deshabilitado = !isCameraReady || isTaking;

  return (
    <View style={styles.contenedor}>
      <StatusBar style="light" />
      <Text style={styles.titulo}>CameraApp UTP</Text>
      <View style={styles.marcoCamara}>
        <CameraView
          ref={cameraRef} //conecta la referencia con el componente de cámara para poder llamar takePictureAsync
          style={styles.camara}
          //Recibe los estados actuales
          facing={facing}
          flash={flash}
          onCameraReady={() => setIsCameraReady(true)} //cuando la vista está lista
        />
        {/*Controles encima (CameraView no admite hijos)*/}
        <View style={styles.barraSuperior}>
          <TouchableOpacity style={styles.chip} onPress={cambiarFlash}>
            <Text style={styles.textoChip}>
              ⚡ Flash: {flash === 'on' ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={cambiarCamara}>
            <Text style={styles.textoChip}>
              {facing === 'back' ? 'Trasera' : 'Frontal'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/*Galería: últimas 3 fotos guardadas*/}
      {galeria.length > 0 && (
        <View style={styles.galeria}>
          {galeria.map((item) => (
            <TouchableOpacity
              key={item.uri} //identificador de cada elemento
              onPress={() => setPhoto(item)} //al tocar, se abre la foto
            >
              <Image source={{ uri: item.uri }} style={styles.miniatura} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={limpiarGaleria} style={styles.contenedorLimpiar}>
            <Text style={styles.limpiar}>Limpiar galería</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[styles.boton, deshabilitado && styles.botonOff]}
        onPress={tomarFoto}
        disabled={deshabilitado}
      >
        {/*Mientras está cargando la foto, muestra "Procesando", al terminar muestra "Tomar foto" para la siguiente*/}
        <Text style={styles.textoBoton}>
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

  marcoCamara: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },

  camara: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },

  barraSuperior: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  chip: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  textoChip: {
    color: '#fff',
    fontWeight: 'bold',
  },

  galeria: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  miniatura: {
    width: 67,
    height: 67,
    borderRadius: 8,
    marginHorizontal: 4,
  },

  contenedorLimpiar: {
    flex: 1,
    alignItems: "flex-end"
  },

  limpiar: {
    color: '#ee6c74',
    fontWeight: "bold",
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

  botonAncho: {
    alignSelf: 'stretch',
  },

  botonOff: {
    opacity: 0.5
  },

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