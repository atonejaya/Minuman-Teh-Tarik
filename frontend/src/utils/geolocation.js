export const getCurrentPosition = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null, error: 'Geolocation tidak didukung browser ini' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, error: null }),
      (err) => resolve({
        latitude: null,
        longitude: null,
        error: err && err.code === 1
          ? 'Akses lokasi ditolak. Periksa izin GPS browser.'
          : 'Gagal mendapatkan lokasi. Coba lagi.',
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};
