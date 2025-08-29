
En realidad Om solamente es electron.

A veces necesitas abrir todo un directorio de archivos.

En el caso de monzon es el system/electron.js

Requiere de toda una parafernalia de herramientas y código.

En otros casos simplemente abrimos un sistema básico de electron.js + index.html

En otros casos está chido tener uno su propio sistema personalizable.

Si se repiten los archivos está bien.

Monzon no tiene que compartir código con otros proyectos.

La idea era que compartieras system files, themes, etc.

Pero todo se vuelve outdated muy rápido. Y tienes DLL errors too fast.

That’s why I like single file html setups. That’s good for longevity.

But monzon is also not bad. It’s a zip with a bunch of files.

So Om is actually a sort of runtime.

You download desktop apps that get run via the runtime which is electron.

It may be electron today but it may be something else tomorrow. That’s fine.

Ahora, el concepto de applets, a desktop and a theme system is useful.

Esto es más bien un protocolo que otra cosa, y bueno pues herramientas también.

Om lo quiero porque puedo hacer cosas más interesantes para mi, como acceder a archivos locales, etc.

Lo quiero para proveerme a mi mismo de APIs más útiles.

Lo quiero para correr mis programas hackeables.

Lo quiero para editar mis archivos HTML editables y exportarlos.

Om Apps
- granite (run without args)
    - api
    - modules (configurable)
    - backups (configurable)
        - space-timestamp.html.tar.zst (sources always inlined)
    - spaces (configurable)
        - public
        - private
            - home.html
            - tinloof
                - home.html
    - package.json
    - hud.js
    - app.js
- monzon
    - src (any setup)
    - package.json
    - app.js (required, adds overlay and calls src/main.js)
- earth
- code


---

I've reorganized it into that way now.
