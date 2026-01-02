# Om

Electron but with a different name and other defaults.

> [!WARNING]
> This project is in a very experimental stage. Breaking changes should be
> expected at any time without notice. Do not use this in production or for
> any critical applications.

## Windows
TODO


## Mac
```bash
./build_mac.sh
```


## Linux

```bash
./build_linux.sh
```


If running in ubuntu/debian you might need the following dependencies if running in headless server:

```bash
sudo apt-get install \
  unzip \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  libatspi2.0-0 \
  libxshmfence1 \
  libgtk-3-0 \
  libgdk-pixbuf2.0-0
```

Unzip package is required to unzip the downloaded electron packages. It can be done manually and thus unzip not required.
