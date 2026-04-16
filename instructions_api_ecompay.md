cURL para gerar a credencial

curl --request POST \\

&#x20; --url https://api.ecompay.app/user/login \\

&#x20; --header 'Accept: /' \\

&#x20; --header 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \\

&#x20; --header 'Connection: keep-alive' \\

&#x20; --header 'Content-Type: application/json' \\

&#x20; --header 'Origin: http://localhost:3000' \\

&#x20; --header 'Referer: http://localhost:3000/' \\

&#x20; --header 'Sec-Fetch-Dest: empty' \\

&#x20; --header 'Sec-Fetch-Mode: cors' \\

&#x20; --header 'Sec-Fetch-Site: same-site' \\

&#x20; --header 'User-Agent: Mozilla/5.0 (X11; Linux x86\_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36' \\

&#x20; --header 'sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"' \\

&#x20; --header 'sec-ch-ua-mobile: ?0' \\

&#x20; --header 'sec-ch-ua-platform: "Linux"' \\

&#x20; --data '{

&#x09;"email": "guilhermesilva@agenciaecom.com.br",

&#x09;"password": "guilgds12"

}'


------------------------------

cURL para puxar a lista de contas associadas

curl --request GET \\

&#x20; --url https://api.ecompay.app/team/my/list \\

&#x20; --header 'Accept: /' \\

&#x20; --header 'Authorization: Bearer \[coloque aqui o valor da key access\_token]

Para esse projeto filtre a conta associada o email suporte@megamatte.com.br

------------------------------



cURL para puxar a lista de produtos



curl --request GET \\

&#x20; --url https://api.ecompay.app/product/list/type/single \\

&#x20; --header 'Authorization: Bearer \[coloque aqui o valor da key access\_token] \\

&#x20; --header 'User-Agent: insomnia/11.0.2' \\

&#x20; --header 'x-profile-id: \[coloque aqui o valor da key \_id que estará fora do objeto target]'

--------------------------------



cURL para puxar a lista de produtos



curl --request GET \\

&#x20; --url https://api.ecompay.app/product/list/type/single \\

&#x20; --header 'Authorization: Bearer \[coloque aqui o valor da key access\_token] \\

&#x20; --header 'User-Agent: insomnia/11.0.2' \\

&#x20; --header 'x-profile-id: \[coloque aqui o valor da key \_id que estará fora do objeto target]'



\------------------------------



cURL para contar as vendas



curl --request POST \\

&#x20; --url https://api.ecompay.app/order/list/1 \\

&#x20; --header 'Authorization: Bearer \[coloque aqui o valor da key access\_token] \\

&#x20; --header 'User-Agent: insomnia/11.0.2' \\

&#x20; --header 'x-profile-id: \[coloque aqui o valor da key \_id que estará fora do objeto target]'



Payload



adminMode: false,

customFieldsList: "nome\_do\_pai,nome\_da\_mae,rg,data\_de\_nascimento,e\_pessoa\_com\_deficiencia?,nome\_do\_mae,bairro,nome\_do\_pai\_,nome\_da\_mae\_,data\_de\_nascimento\_,sou\_deficiente,nome\_completo\_aluno,cpf\_aluno,e-mail,data\_nascimento\_aluno,aluno\_possui\_necessidades\_especiais?,nome\_da\_pai,e-mail\_aluno,crmv,rg\_do\_aluno,e\_pessoa\_com\_deficiencia?\_,nome\_completo,telefone,aluno\_possui\_necessidades\_especiais?\_,data\_de\_nascimento\_aluno,nome\_do\_aluno:,cpf\_do\_aluno:,e-mail\_do\_aluno:,endereco\_do\_aluno:,nome\_do\_aluno,contato\_telefonico,e-mail\_do\_aluno,rg\_do\_aluno\_,possui\_alguma\_necessidade\_especial?\_,nome,data\_de\_nascimento:,endereco:,endereco,e\_pessoal\_com\_deficiencia?,crmv\_/\_uf,possui\_algum\_tipo\_de\_deficiencia?,sua\_especializacao,bairro\_,contato\_de\_emergencia\_(nome+telefone)"



filtros para serem usados no payload acima



products: "\[id do produto]"



\------------------------------



cURL para puxar a soma das vendas



curl --request POST \\

&#x20; --url https://api.ecompay.app/order/sum \\

&#x20; --header 'Authorization: Bearer \[coloque aqui o valor da key access\_token] \\

&#x20; --header 'User-Agent: insomnia/11.0.2' \\

&#x20; --header 'x-profile-id: \[coloque aqui o valor da key \_id que estará fora do objeto target]'



filtros para serem usados no payload acima



products: "\[id do produto]"

status: \"paid"
status: \"pending"

Sendo paid para puxar a soma dos valores de vendas concluidas e pending para puxar os valores de vendas em pocessamento
------------------------------





