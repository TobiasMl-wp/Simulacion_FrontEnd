import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [estadoViaje, setEstadoViaje] = useState('');
  const [costo, setCosto] = useState(null);
  const [zonaActual, setZonaActual] = useState('');
  const [paradaActual, setParadaActual] = useState('');
  const [intervalId, setIntervalId] = useState(null);
  const [leyendoTarjeta, setLeyendoTarjeta] = useState(false);
  const [idViaje, setIdViaje] = useState(null);
  const [saldoRestante, setSaldoRestante] = useState(null);
  const videoRef = useRef(null);

  // Obtener la siguiente zona y parada del backend
  const obtenerSiguienteZonaYParada = async () => {
    try {
      const respuesta = await fetch('http://localhost:4000/api/siguiente-zona');
      const zonaData = await respuesta.json();
      
      setZonaActual(zonaData.nombre_zona);
      setParadaActual(zonaData.descripcion);
    } catch (error) {
      console.error('Error al obtener la siguiente zona y parada:', error);
    }
  };

  useEffect(() => {
    iniciarCamara();
  
    const checkStream = setInterval(() => {
      if (!videoRef.current || !videoRef.current.srcObject) {
        iniciarCamara(); // Restart the camera if it stops
      }
    }, 5000); // Check every 5 seconds
  
    return () => clearInterval(checkStream); // Clear the interval on unmount
  }, []);
  
  const iniciarCamara = async () => {
    try {
      if (!videoRef.current || !videoRef.current.srcObject) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      setEstadoViaje('');
    }
  };

  const acercarTarjeta = () => {
    setLeyendoTarjeta(true);
    setEstadoViaje('Leyendo tarjeta SUBE...');
    setTimeout(() => {
      const zonaOrigen = '1';
      iniciarViaje(zonaOrigen);
    }, 3000);
  };

  const iniciarViaje = async (zonaOrigen) => {
    const numeroTarjeta = '6061 2684 7892 9355';
    setEstadoViaje('¡Viaje iniciado con un costo inicial de $1000!');
    try {
      const response = await fetch('http://localhost:4000/api/iniciar-viaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numeroTarjeta, zonaOrigen }),
      });

      if (!response.ok) {
        const data = await response.json();
        setEstadoViaje(data.mensaje);
        setLeyendoTarjeta(false);
        return;
      }

      const data = await response.json();
      setViajeIniciado(true);
      setIdViaje(data.idViaje);
      setCosto(1000);
      setLeyendoTarjeta(false);

      // Iniciar el cambio de zonas y paradas cada 5 segundos
      const id = setInterval(() => {
        obtenerSiguienteZonaYParada();
      }, 5000);
      setIntervalId(id);
      setSaldoRestante(data.nuevoSaldo);
    } catch (error) {
      console.error('Error al iniciar el viaje:', error);
      setEstadoViaje('Error al iniciar el viaje');
      setLeyendoTarjeta(false);
    }
  };

  const finalizarViaje = async () => {
    setEstadoViaje('Finalizando el viaje...');
    try {
      const zonaDestino = zonaActual; 
      const response = await fetch('http://localhost:4000/api/finalizar-viaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idViaje, zonaDestino }),
      });

      if (!response.ok) {
        const data = await response.json();
        setEstadoViaje(data.mensaje);
        return;
      }

      const data = await response.json();
      setViajeIniciado(false);
      setEstadoViaje(`Viaje finalizado. Costo total: $${data.tarifaFinal}.`);
      setSaldoRestante(data.nuevoSaldo);

      // Detener el cambio de zonas y paradas
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }

      setCosto(data.tarifaFinal);

      // Limpiar el mensaje de finalización después de un breve tiempo
      setTimeout(() => {
        setEstadoViaje('');
      }, 2000);
    } catch (error) {
      console.error('Error al finalizar el viaje:', error);
      setEstadoViaje('Error al finalizar el viaje');
    }
  };

  return (
    <div className="App">
        <div className="content">
            <h1>Simulación de Viaje (Pay Scan)</h1>
            
            <div className="contenedor-mensajes">
                <h2>Información del Viaje</h2>
                <p>{estadoViaje}</p>
                <h2>Zona del Recorrido</h2>
                <p>{zonaActual ? zonaActual : 'Zona no disponible'}</p>
                <h2>Nombre de la Zona</h2>
                <p>{paradaActual ? paradaActual : 'Parada no disponible'}</p>
                <h2>Costo del Viaje</h2>
                <p>{costo !== null ? `$${costo}` : 'Costo no calculado aún'}</p>
                <h2>Saldo Restante en la Tarjeta</h2>
                <p>{saldoRestante !== null ? `$${saldoRestante}` : 'Saldo no disponible'}</p>
            </div>

            {!viajeIniciado && (
                <button className="boton-acercar" onClick={acercarTarjeta} disabled={leyendoTarjeta}>
                    {leyendoTarjeta ? 'Leyendo tarjeta...' : 'Leer la Tarjeta'}
                </button>
            )}
            {viajeIniciado && (
                <button className="boton-finalizar" onClick={finalizarViaje}>
                    Leer tarjeta
                </button>
            )}
        </div>
    </div>
  );
}

export default App;
